import {supabase} from '../supabase-config.js';
const lista=document.getElementById('listaLocais'), aviso=document.getElementById('aviso'), pesquisa=document.getElementById('pesquisa');
let pontos=[];
function escapeHTML(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
 const termo=pesquisa.value.trim().toLocaleLowerCase('pt-BR');
 const filtrados=pontos.filter(p=>[p.name,p.address,p.city,p.state].join(' ').toLocaleLowerCase('pt-BR').includes(termo));
 if(!filtrados.length){lista.innerHTML='<div class="vazio">Nenhum ponto de coleta encontrado. Tente outra pesquisa ou volte mais tarde.</div>';return;}
 lista.innerHTML=filtrados.map(p=>{
  const destino=encodeURIComponent([p.name,p.address,p.city,p.state,'Brasil'].filter(Boolean).join(', '));
  return `<article class="local"><div><h2>${escapeHTML(p.name)}</h2><p><i class="fa-solid fa-location-dot"></i> ${escapeHTML(p.address)} — ${escapeHTML(p.city)}/${escapeHTML(p.state)}</p><p>Entre em contato com o estabelecimento para confirmar os materiais aceitos e o horário de atendimento.</p></div><a class="rota" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${destino}"><i class="fa-solid fa-route"></i> Ver rota</a></article>`;
 }).join('');
}
async function carregar(){
 const {data,error}=await supabase.from('collection_points').select('id,name,address,city,state,ativo').eq('ativo',true).order('name');
 if(error){console.error(error);aviso.textContent='Não foi possível carregar os pontos. Verifique se a coluna collection_points.ativo e as permissões do Supabase estão configuradas.';lista.innerHTML='<div class="vazio">Os pontos de coleta ainda não estão disponíveis.</div>';return;}
 pontos=data||[];aviso.textContent=`${pontos.length} ponto(s) de coleta ativo(s) cadastrado(s).`;render();
}
pesquisa.addEventListener('input',render);document.getElementById('limpar').addEventListener('click',()=>{pesquisa.value='';render();});carregar();
