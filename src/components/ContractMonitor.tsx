import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { dbGetEquipamentos, type DBEquipamento } from '../services/db';
import { getEmpresaAtiva, syncAllClientes, getServicosByCliente } from '../services/ixcApi';

// Intervalo padrão: 30 minutos (em ms)
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

export interface ContractAlert {
    equipamento: DBEquipamento;
    clienteNome: string;
    clienteId: string;
    motivoAlerta: string; // ex: "Contrato Cancelado", "Contrato Bloqueado", "Nenhum contrato ativo"
}

export function ContractMonitor() {
    const [alerts, setAlerts] = useState<ContractAlert[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [syncLog, setSyncLog] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const runMonitor = useCallback(async () => {
        setSyncing(true);
        setSyncLog('Iniciando sincronização automática...');
        try {
            // ── ETAPA 1: Re-sincronizar todos os clientes do IXC ──
            const emp = getEmpresaAtiva();
            if (!emp) {
                setSyncLog('Nenhuma empresa ativa configurada.');
                setSyncing(false);
                return;
            }

            setSyncLog('Sincronizando clientes do IXC...');
            const totalSynced = await syncAllClientes(emp, (fetched, total) => {
                setSyncLog(`Sincronizando clientes: ${fetched} / ${total}`);
            });
            setSyncLog(`${totalSynced} clientes sincronizados. Verificando contratos...`);

            // ── ETAPA 2: Buscar equipamentos "No Cliente" ──
            const equips = await dbGetEquipamentos();
            const noCliente = equips.filter(eq => eq.status === 'No Cliente' && eq.ixc_cliente_id);

            if (noCliente.length === 0) {
                setSyncLog(`Sync OK (${totalSynced} clientes). Nenhum equipamento em campo.`);
                setLastSync(new Date());
                setSyncing(false);
                return;
            }

            // ── ETAPA 3: Verificar contratos de cada cliente ──
            const newAlerts: ContractAlert[] = [];
            const checkedClients = new Set<string>();

            for (const eq of noCliente) {
                const cId = eq.ixc_cliente_id!;
                if (checkedClients.has(cId)) {
                    // Já verificamos esse cliente, veja se temos alerta dele
                    const existingAlert = newAlerts.find(a => a.clienteId === cId);
                    if (existingAlert) {
                        // Adicionar o equipamento extra também como alerta
                        newAlerts.push({
                            equipamento: eq,
                            clienteNome: eq.ixc_cliente_nome || 'Desconhecido',
                            clienteId: cId,
                            motivoAlerta: existingAlert.motivoAlerta
                        });
                    }
                    continue;
                }
                checkedClients.add(cId);

                setSyncLog(`Verificando contratos do cliente ${eq.ixc_cliente_nome || cId}...`);

                try {
                    // Primeiro, resolve o ID real do IXC usando o nome do cliente
                    const clienteNome = eq.ixc_cliente_nome || '';
                    let ixcRealId = cId; // fallback to stored id

                    if (clienteNome) {
                        try {
                            const lookupRes = await fetch(`/db/clientes/buscar-ixc-id?nome=${encodeURIComponent(clienteNome)}&empresa_id=${encodeURIComponent(emp.id)}`);
                            const lookupData = await lookupRes.json();
                            console.log(`[ContractMonitor] Lookup "${clienteNome}" => IXC ID:`, lookupData);
                            if (lookupData.id) {
                                ixcRealId = String(lookupData.id);
                            } else {
                                // Cliente não encontrado no IXC sync — provavelmente cadastrado manualmente
                                console.log(`[ContractMonitor] Cliente "${clienteNome}" não encontrado em clientes_sync, pulando.`);
                                continue; // Não alarmar, pois não veio do IXC
                            }
                        } catch (lookupErr) {
                            console.warn('[ContractMonitor] Falha ao buscar IXC ID:', lookupErr);
                        }
                    }

                    setSyncLog(`Verificando contratos do cliente ${clienteNome || ixcRealId} (IXC ID: ${ixcRealId})...`);
                    const servicos = await getServicosByCliente(emp, ixcRealId);

                    console.log(`[ContractMonitor] Cliente "${clienteNome}" (IXC ID: ${ixcRealId}) - ${servicos.length} contratos encontrados`);
                    if (servicos.length > 0) {
                        console.log(`[ContractMonitor] Contratos:`, servicos.map((s: any) => ({
                            id: s.id,
                            status: s.status,
                            status_contrato: s.status_contrato,
                            descricao: s.contrato || s.descricao || s.id_contrato,
                        })));
                    }

                    // Verificar status ativo: IXC pode usar 'A', 'Ativo', 'S' ou campo status_contrato
                    const algumAtivo = servicos.some((s: any) => {
                        const st = (s.status || '').toString().toUpperCase();
                        const stContrato = (s.status_contrato || '').toString().toUpperCase();
                        return st === 'A' || st === 'ATIVO' || st === 'S' ||
                            stContrato === 'A' || stContrato === 'ATIVO' || stContrato === 'S';
                    });

                    if (!algumAtivo) {
                        // Identificar o motivo
                        let motivo = 'Nenhum contrato ativo encontrado';
                        if (servicos.length > 0) {
                            const statuses = servicos.map((s: any) => (s.status || s.status_contrato || '').toString().toUpperCase());
                            if (statuses.includes('B') || statuses.includes('BLOQUEADO')) motivo = 'Contrato Bloqueado';
                            else if (statuses.includes('I') || statuses.includes('INATIVO')) motivo = 'Contrato Cancelado / Inativo';
                            else motivo = `Contrato status: ${servicos.map((s: any) => s.status || s.status_contrato).join(', ')}`;
                        }

                        console.warn(`[ContractMonitor] ⚠️ ALERTA: Cliente "${clienteNome}" - ${motivo}`);

                        // Subir alerta para todos os equipamentos deste cliente
                        const eqsDoCliente = noCliente.filter(e => e.ixc_cliente_id === cId);
                        for (const eqCli of eqsDoCliente) {
                            newAlerts.push({
                                equipamento: eqCli,
                                clienteNome: eqCli.ixc_cliente_nome || 'Desconhecido',
                                clienteId: cId,
                                motivoAlerta: motivo
                            });
                        }
                    } else {
                        console.log(`[ContractMonitor] ✅ Cliente "${clienteNome}" - contrato ativo OK`);
                    }
                } catch (err) {
                    console.warn(`Falha ao verificar contratos do cliente ${cId}:`, err);
                }
            }

            if (newAlerts.length > 0) {
                setAlerts(newAlerts);
                setDismissed(false); // Força exibir de novo
            } else {
                setAlerts([]);
            }

            setSyncLog(`Sync completa. ${totalSynced} clientes, ${noCliente.length} equips verificados, ${newAlerts.length} alertas.`);
            setLastSync(new Date());
        } catch (err) {
            console.error('ContractMonitor error:', err);
            setSyncLog('Erro na sincronização. Próxima tentativa em 30 min.');
        } finally {
            setSyncing(false);
        }
    }, []);

    useEffect(() => {
        // Executar logo 10s após montar (dar tempo da UI carregar)
        const initialTimer = setTimeout(() => {
            runMonitor();
        }, 10_000);

        // Depois rodar a cada 30 min
        intervalRef.current = setInterval(runMonitor, SYNC_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimer);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [runMonitor]);

    // ── Se não tem alertas ou já descartou, renderizar status mínimo ──
    if (alerts.length === 0 || dismissed) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                {/* Indicador de sync */}
                {syncing && (
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-xs flex items-center gap-2 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {syncLog}
                    </div>
                )}
                {!syncing && lastSync && (
                    <div
                        className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg shadow text-xs cursor-pointer hover:bg-gray-700 transition-colors flex items-center gap-2"
                        title="Clique para forçar sincronização agora"
                        onClick={() => runMonitor()}
                    >
                        <RefreshCw className="w-3 h-3" />
                        Sync: {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {alerts.length > 0 && (
                            <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold ml-1 animate-bounce">
                                {alerts.length}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── Popup de Alerta Vermelho ──
    // Agrupar alertas por cliente
    const porCliente = new Map<string, ContractAlert[]>();
    alerts.forEach(a => {
        const existing = porCliente.get(a.clienteId) || [];
        existing.push(a);
        porCliente.set(a.clienteId, existing);
    });

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border-2 border-red-500">
                {/* Header vermelho */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">⚠️ Alerta de Equipamentos</h3>
                            <p className="text-red-100 text-xs">Clientes com contrato inativo possuem seus equipamentos</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-white/70 hover:text-white p-1"
                        title="Fechar (o alerta retornará na próxima verificação)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Lista de alertas */}
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                    {[...porCliente.entries()].map(([clienteId, clienteAlerts]) => (
                        <div key={clienteId} className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-red-900 text-sm">{clienteAlerts[0].clienteNome}</h4>
                                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                    {clienteAlerts[0].motivoAlerta}
                                </span>
                            </div>
                            <ul className="space-y-1">
                                {clienteAlerts.map(a => (
                                    <li key={a.equipamento.id} className="text-sm text-red-800 flex items-center justify-between">
                                        <span>📷 <strong>{a.equipamento.categoria}</strong>: {a.equipamento.modelo}</span>
                                        <span className="text-xs text-red-600 font-mono">
                                            S/N: {a.equipamento.serial_number || a.equipamento.mac || 'N/A'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-red-600 mt-2 italic">
                                Recolha os equipamentos acima via Clientes → Editar → Devolver ao Estoque.
                            </p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        A verificação acontece automaticamente a cada 30 min.
                    </p>
                    <button
                        onClick={() => setDismissed(true)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        Ciente, fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
