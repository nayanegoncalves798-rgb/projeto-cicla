import {supabase} from '../supabase-config.js';
const aviso=document.getElementById('aviso'),statusEl=document.getElementById('status'),explicacao=document.getElementById('explicacao');
const formEmpresa=document.getElementById('formEmpresa'),formPonto=document.getElementById('formPonto'),listaPontos=document.getElementById('listaPontos'),listaEntregas=document.getElementById('listaEntregas');
let usuarioAtual=null,cadastroEmpresa=null;
function mostrarAviso(t,tipo='sucesso'){aviso.textContent=t;aviso.className=`aviso visivel ${tipo}`;}
function normalizarCnpj(v){return v.replace(/\D/g,'');}
function formatarCnpj(v){const n=normalizarCnpj(v).slice(0,14);return n.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
document.getElementById('cnpj').addEventListener('input',e=>e.target.value=formatarCnpj(e.target.value));
document.getElementById('sair').addEventListener('click',async()=>{await supabase.auth.signOut();location.href='../index/index.html';});
async function iniciar(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.user){location.href='../login/login.html';return;}
 usuarioAtual=session.user;
 if(usuarioAtual.user_metadata?.tipo!=='empresa'){mostrarAviso('Esta área é exclusiva para contas empresariais.','erro');formEmpresa.classList.add('escondido');formPonto.classList.add('escondido');return;}
 document.getElementById('nomeEmpresa').value=usuarioAtual.user_metadata?.nomeEmpresa||'';
 document.getElementById('cnpj').value=formatarCnpj(usuarioAtual.user_metadata?.cnpj||'');
 await carregarCadastro();
}
async function carregarCadastro(){
 const {data,error}=await supabase.from('company_profiles').select('id,company_name,cnpj,status,review_note,created_at').eq('user_id',usuarioAtual.id).maybeSingle();
 if(error){explicacao.textContent='Execute o arquivo SUPABASE_COMPLETO.sql no Supabase para habilitar a área empresarial.';statusEl.textContent='Configuração necessária';console.error(error);return;}
 cadastroEmpresa=data;
 if(!data){statusEl.textContent='Cadastro não enviado';explicacao.textContent='Envie seus dados para análise. A empresa ficará pendente até a aprovação da equipe CICLA.';return;}
 document.getElementById('nomeEmpresa').value=data.company_name;document.getElementById('cnpj').value=formatarCnpj(data.cnpj);
 formEmpresa.querySelectorAll('input').forEach(i=>i.readOnly=true);document.getElementById('enviarCadastro').classList.add('escondido');
 const labels={pending:'Em análise',approved:'Aprovada',rejected:'Rejeitada'};statusEl.textContent=labels[data.status]||data.status;statusEl.className=`status ${data.status==='approved'?'aprovada':data.status==='rejected'?'rejeitada':''}`;
 explicacao.textContent=data.status==='approved'?'Cadastro aprovado! Você pode cadastrar pontos e confirmar entregas.':data.status==='rejected'?`Cadastro recusado. ${data.review_note||'Entre em contato com a equipe CICLA.'}`:'Seu cadastro está aguardando análise. Enquanto isso, os pontos e entregas permanecem bloqueados.';
 if(data.status==='approved')formPonto.classList.remove('escondido');
 await Promise.all([carregarPontos(),carregarEntregas()]);
}
formEmpresa.addEventListener('submit',async e=>{
 e.preventDefault();if(!usuarioAtual||cadastroEmpresa)return;
 const company_name=document.getElementById('nomeEmpresa').value.trim(),cnpj=normalizarCnpj(document.getElementById('cnpj').value);
 if(company_name.length<2||cnpj.length!==14)return mostrarAviso('Informe o nome da empresa e um CNPJ com 14 números.','erro');
 const btn=document.getElementById('enviarCadastro');btn.disabled=true;
 const {error}=await supabase.from('company_profiles').insert({user_id:usuarioAtual.id,company_name,cnpj,status:'pending'});btn.disabled=false;
 if(error){mostrarAviso(error.code==='23505'?'Este CNPJ já possui cadastro.':'Não foi possível enviar. Confira o SQL do Supabase.','erro');console.error(error);return;}
 mostrarAviso('Cadastro enviado para análise.');await carregarCadastro();
});
async function carregarPontos(){
 const {data,error}=await supabase.from('collection_points').select('id,name,address,city,state,ativo').eq('owner_id',usuarioAtual.id).order('name');
 if(error){listaPontos.textContent='Não foi possível carregar os pontos.';console.error(error);return;}
 listaPontos.innerHTML=data?.length?data.map(p=>`<div class="item-lista"><strong>${esc(p.name)}</strong><p>${esc(p.address)} — ${esc(p.city)}/${esc(p.state)} · ${p.ativo?'Ativo':'Inativo'}</p></div>`).join():'<p class="vazio">Nenhum ponto cadastrado.</p>';
}
formPonto.addEventListener('submit',async e=>{
 e.preventDefault();const btn=formPonto.querySelector('button');btn.disabled=true;
 const payload={p_name:document.getElementById('pontoNome').value.trim(),p_address:document.getElementById('pontoEndereco').value.trim(),p_city:document.getElementById('pontoCidade').value.trim(),p_state:document.getElementById('pontoEstado').value.trim().toUpperCase()};
 const {error}=await supabase.rpc('company_add_collection_point',payload);btn.disabled=false;
 if(error){mostrarAviso(error.message||'Não foi possível cadastrar o ponto.','erro');console.error(error);return;}
 formPonto.reset();mostrarAviso('Ponto de coleta cadastrado!');await carregarPontos();
});
async function carregarEntregas(){
 const {data,error}=await supabase.from('deliveries').select('id,material,peso_estimado,peso_confirmado,status,pontos_liberados,created_at,collection_points!inner(name,owner_id)').eq('collection_points.owner_id',usuarioAtual.id).order('created_at',{ascending:false});
 if(error){listaEntregas.textContent='Não foi possível carregar as entregas.';console.error(error);return;}
 const rows=data||[];
 listaEntregas.innerHTML=rows.length?rows.map(d=>`<div class="item-lista"><strong>${esc(d.material)} · ${esc(d.collection_points.name)}</strong><p>Peso informado: ${d.peso_estimado} kg · Status: ${({pending:'Pendente',confirmed:'Confirmada',rejected:'Recusada'}[d.status]||d.status)}${d.peso_confirmado?` · Confirmado: ${d.peso_confirmado} kg`:''}${d.pontos_liberados?` · ${d.pontos_liberados} pontos liberados`:''}</p>${d.status==='pending'?`<div class="confirmar-entrega"><label>Peso conferido (kg)<input type="number" min="0.1" max="10000" step="0.1" id="peso-${d.id}" value="${d.peso_estimado}"></label><button type="button" data-confirm="${d.id}">Confirmar peso e liberar pontos</button><button type="button" class="rejeitar" data-reject="${d.id}">Recusar entrega</button></div>`:''}</div>`).join(''):'<p class="vazio">Nenhuma entrega recebida até o momento.</p>';
}
listaEntregas.addEventListener('click',async e=>{
 const yes=e.target.closest('[data-confirm]'),no=e.target.closest('[data-reject]');if(!yes&&!no)return;
 const id=(yes||no).dataset.confirm||(yes||no).dataset.reject,accept=!!yes;
 const weight=accept?Number(document.getElementById(`peso-${id}`).value):null;
 if(accept&&(!Number.isFinite(weight)||weight<=0)){mostrarAviso('Informe um peso confirmado válido.','erro');return;}
 if(!confirm(accept?'Confirmar o peso e liberar os pontos ao usuário?':'Recusar esta entrega?'))return;
 const btn=yes||no;btn.disabled=true;
 const {data,error}=await supabase.rpc('company_confirm_delivery',{p_delivery_id:id,p_confirmed_weight:weight,p_accept:accept});btn.disabled=false;
 if(error){mostrarAviso(error.message||'Não foi possível processar a entrega.','erro');console.error(error);return;}
 mostrarAviso(accept?`Entrega confirmada. ${data||0} pontos liberados.`:'Entrega recusada.');await carregarEntregas();
});
iniciar();
