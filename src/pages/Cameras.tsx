import { Maximize, Monitor } from 'lucide-react';

const cameras = [
    { id: 1, name: 'Entrada Principal', client: 'Empresa ABC Ltda', ip: '192.168.0.101', status: 'Online' },
    { id: 2, name: 'Estacionamento', client: 'João Silva', ip: '192.168.1.105', status: 'Online' },
    { id: 3, name: 'Recepção', client: 'Empresa ABC Ltda', ip: '192.168.0.103', status: 'Offline' },
];

export function Cameras() {
    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-dark">Câmeras</h2>
                <p className="text-gray-600">Acesso remoto às câmeras</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cameras.map((camera) => (
                    <div key={camera.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="bg-gray-200 border-2 border-dashed border-gray-300 rounded-xl w-full h-48 flex items-center justify-center">
                            <span className="text-gray-500 flex flex-col items-center">
                                <Monitor className="w-8 h-8 mb-2 opacity-50" />
                                Visualização da Câmera {camera.id}
                            </span>
                        </div>
                        <div className="mt-3">
                            <h4 className="font-semibold text-gray-800">{camera.name}</h4>
                            <p className="text-sm text-gray-600">Cliente: {camera.client}</p>
                            <p className="text-sm text-gray-600">IP: {camera.ip}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${camera.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {camera.status}
                                </span>
                                <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                                    <Maximize className="w-4 h-4 mr-1" /> Tela Cheia
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
