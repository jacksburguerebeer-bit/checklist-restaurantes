'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Check, X, Camera, ArrowLeft, ArrowRight } from 'lucide-react';

type Pergunta = {
  id: string;
  texto: string;
  exige_foto: boolean;
  ordem: number;
};

type Checklist = {
  id: string;
  nome: string;
  descricao: string;
};

export default function ChecklistPage() {
  const router = useRouter();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [observacao, setObservacao] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [execucaoId, setExecucaoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    iniciarChecklist();
  }, []);

  const iniciarChecklist = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Buscar checklist disponível (simulado)
      const response = await axios.get('http://localhost:3001/api/checklists', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.length > 0) {
        const checklistId = response.data[0].id;
        
        // Iniciar execução
        const execResponse = await axios.post(
          `http://localhost:3001/api/checklists/${checklistId}/executar`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setChecklist(execResponse.data.checklist);
        setPerguntas(execResponse.data.perguntas);
        setExecucaoId(execResponse.data.execucao.id);
        setLoading(false);
      } else {
        toast.error('Nenhum checklist disponível');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Erro ao iniciar checklist');
      router.push('/dashboard');
    }
  };

  const responderPergunta = async (resposta: string) => {
    if (!execucaoId) return;

    const pergunta = perguntas[perguntaAtual];
    
    // Validar se não conforme precisa de observação
    if (resposta === 'NAO_CONFORME' && !observacao.trim()) {
      toast.warning('Observação obrigatória para não conformidade');
      return;
    }

    // Validar se precisa de foto
    if (resposta === 'NAO_CONFORME' && pergunta.exige_foto && !foto) {
      toast.warning('Foto obrigatória para esta não conformidade');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('pergunta_id', pergunta.id);
      formData.append('resposta', resposta);
      formData.append('observacao', observacao);
      
      if (foto) {
        // Converter data URL para blob
        const blob = await fetch(foto).then(r => r.blob());
        formData.append('foto', blob, 'foto.jpg');
      }

      await axios.post(
        `http://localhost:3001/api/execucoes/${execucaoId}/responder`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Salvar resposta localmente
      setRespostas(prev => ({
        ...prev,
        [pergunta.id]: resposta,
      }));

      // Limpar para próxima pergunta
      setObservacao('');
      setFoto(null);

      // Próxima pergunta ou finalizar
      if (perguntaAtual < perguntas.length - 1) {
        setPerguntaAtual(prev => prev + 1);
      } else {
        finalizarChecklist();
      }

    } catch (error) {
      toast.error('Erro ao registrar resposta');
    }
  };

  const tirarFoto = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Câmera não disponível');
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const fotoData = canvas.toDataURL('image/jpeg');
            setFoto(fotoData);
            
            // Parar stream
            stream.getTracks().forEach(track => track.stop());
            toast.success('Foto capturada!');
          }
        }, 500);
      })
      .catch(() => toast.error('Erro ao acessar câmera'));
  };

  const finalizarChecklist = async () => {
    if (!execucaoId) return;

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `http://localhost:3001/api/execucoes/${execucaoId}/finalizar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Checklist finalizado com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Erro ao finalizar checklist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const pergunta = perguntas[perguntaAtual];
  const progresso = ((perguntaAtual + 1) / perguntas.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">{checklist?.nome}</h1>
          <div className="w-10"></div>
        </div>
        
        {/* Progresso */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progresso</span>
            <span>{perguntaAtual + 1} de {perguntas.length}</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progresso}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Pergunta Atual */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-600">
              Pergunta {perguntaAtual + 1}
            </span>
            {pergunta.exige_foto && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                Exige foto se não conforme
              </span>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {pergunta.texto}
          </h2>

          {/* Controles de Foto */}
          {pergunta.exige_foto && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">Foto da não conformidade:</span>
                <button
                  onClick={tirarFoto}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                >
                  <Camera className="w-4 h-4" />
                  {foto ? 'Refazer Foto' : 'Tirar Foto'}
                </button>
              </div>
              
              {foto && (
                <div className="relative">
                  <img 
                    src={foto} 
                    alt="Foto da não conformidade" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setFoto(null)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Campo de Observação */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observação (obrigatório para não conformidade)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="Descreva a não conformidade..."
            />
          </div>
        </div>

        {/* Botões de Resposta */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => responderPergunta('CONFORME')}
            className="flex flex-col items-center justify-center p-6 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 active:scale-95 transition"
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
              <Check className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold">Conforme</span>
          </button>

          <button
            onClick={() => responderPergunta('NAO_CONFORME')}
            disabled={!observacao.trim() && pergunta.exige_foto && !foto}
            className="flex flex-col items-center justify-center p-6 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-95 transition disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-2">
              <X className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold">Não Conforme</span>
          </button>

          <button
            onClick={() => responderPregunta('NAO_SE_APLICA')}
            className="flex flex-col items-center justify-center p-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 active:scale-95 transition"
          >
            <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center mb-2">
              <span className="text-white font-bold">N/A</span>
            </div>
            <span className="font-semibold">Não se Aplica</span>
          </button>
        </div>

        {/* Navegação */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setPerguntaAtual(prev => Math.max(0, prev - 1))}
            disabled={perguntaAtual === 0}
            className="px-6 py-3 border border-gray-300 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          <button
            onClick={() => {
              if (perguntaAtual < perguntas.length - 1) {
                setPerguntaAtual(prev => prev + 1);
              } else {
                finalizarChecklist();
              }
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg flex items-center gap-2"
          >
            {perguntaAtual < perguntas.length - 1 ? 'Próxima' : 'Finalizar'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}