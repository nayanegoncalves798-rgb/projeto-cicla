import {supabase} from '../supabase-config.js';
const loginAviso=document.getElementById('loginAviso'),painel=document.getElementById('painelUsuario');
const saldoEl=document.getElementById('saldo'),resumo=document.getElementById('resumoSaldo');
const pontoSelect=document.getElementById('ponto'),form=document.getElementById('formEntrega'),entregaMsg=document.getElementById('entregaMsg');
let user=null,pointsEarned=0,pointsSpent=0;
const rates={Papel:5,Papelão:4,Plástico:10,Vidro:3,Metal:15};
const fmt=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
function aviso(text){loginAviso.textContent=text;}
function statusPt(s){return ({pending:'Aguardando confirmação',confirmed:'Confirmada',rejected:'Recusada',approved:'Aprovado',delivered:'Disponibilizado'}[s]||s);}
async function iniciar(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.user){aviso('Para registrar entregas e consultar seus pontos, entre ou crie uma conta de usuário. ');loginAviso.innerHTML='Para usar sua carteira, <a href="../login/login.html">entre ou crie uma conta</a>.';return;}
 user=session.user;
 if(user.user_metadata?.tipo==='empresa'){aviso('Esta área é destinada a usuários comuns. Acesse a área da sua empresa.');loginAviso.innerHTML='Esta área é destinada a usuários comuns. <a href="../empresa/empresa.html">Acesse a área da sua empresa</a>.';return;}
 painel.classList.remove('escondido');loginAviso.classList.add('escondido');
 await Promise.all([carregarPontos(),carregarHistorico(),carregarGiftcards(),carregarResgates()]);
}
async function carregarPontos(){
 const {data,error}=await supabase.from('collection_points').select('id,name,address,city,state').eq('ativo',true).order('name');
 if(error){pontoSelect.innerHTML='<option value="">Não foi possível carregar os pontos</option>';console.error(error);return;}
 pontoSelect.innerHTML='<option value="">Selecione um ponto de coleta</option>'+(data||[]).map(p=>`<option value="${p.id}">${esc(p.name)} — ${esc(p.city)}/${esc(p.state)}</option>`).join('');
}
async function carregarHistorico(){
 const {data,error}=await supabase.from('deliveries').select('id,material,peso_estimado,peso_confirmado,status,pontos_liberados,created_at').eq('user_id',user.id).order('created_at',{ascending:false});
 if(error){document.getElementById('entregas').textContent='Não foi possível carregar as entregas. Confira as permissões do banco.';console.error(error);return;}
 const rows=data||[];pointsEarned=rows.filter(x=>x.status==='confirmed').reduce((a,x)=>a+Number(x.pontos_liberados||0),0);
 await carregarResgates(false);
 saldoEl.textContent=`${fmt(Math.max(0,pointsEarned-pointsSpent))} pontos`;
 resumo.textContent=`${fmt(pointsEarned)} pontos recebidos · ${fmt(pointsSpent)} pontos utilizados`;
 document.getElementById('entregas').innerHTML=rows.length?rows.map(x=>`<div class="registro"><strong>${esc(x.material)} · ${fmt(x.peso_estimado)} kg</strong><small>${new Date(x.created_at).toLocaleString('pt-BR')} · ${statusPt(x.status)}${x.peso_confirmado?` · Peso confirmado: ${fmt(x.peso_confirmado)} kg`:''}</small>${x.status==='confirmed'?`<small>+${fmt(x.pontos_liberados)} pontos</small>`:''}</div>`).join(''):'<p>Nenhuma entrega registrada ainda.</p>';
}
async function carregarGiftcards(){
 const {data,error}=await supabase.from('gift_cards').select('id,partner_name,title,description,points_cost,stock').eq('active',true).order('points_cost');
 const el=document.getElementById('giftcards');
 if(error){el.textContent='Não foi possível carregar as recompensas. Confira a migração SQL.';console.error(error);return;}
 if(!data?.length){el.innerHTML='<p>As recompensas das empresas parceiras serão exibidas aqui assim que forem cadastradas pela administração do CICLA.</p>';return;}
 el.innerHTML=data.map(g=>`<article class="giftcard"><h4>${esc(g.title)}</h4><p><strong>${esc(g.partner_name)}</strong></p><p>${esc(g.description||'Gift card de parceiro CICLA.')}</p><p><strong>${fmt(g.points_cost)} pontos</strong></p><small>${g.stock===null?'Disponibilidade sob consulta':`${g.stock} unidade(s) disponíveis`}</small><button type="button" data-gift="${g.id}">Solicitar resgate</button></article>`).join('');
 el.querySelectorAll('[data-gift]').forEach(b=>b.addEventListener('click',()=>resgatar(b.dataset.gift,b)));
}
async function carregarResgates(refresh=true){
 if(!user)return;
 const {data,error}=await supabase.from('gift_card_redemptions').select('id,points_cost,status,voucher_code,created_at,gift_cards(title,partner_name)').eq('user_id',user.id).order('created_at',{ascending:false});
 if(error){document.getElementById('resgates').textContent='Nenhum resgate ou configuração pendente.';console.error(error);return;}
 const rows=data||[];pointsSpent=rows.filter(x=>x.status!=='rejected').reduce((a,x)=>a+Number(x.points_cost||0),0);
 document.getElementById('resgates').innerHTML=rows.length?rows.map(x=>`<div class="registro"><strong>${esc(x.gift_cards?.title||'Gift card')} · ${fmt(x.points_cost)} pontos</strong><small>${esc(x.gift_cards?.partner_name||'Parceiro')} · ${statusPt(x.status)} · ${new Date(x.created_at).toLocaleDateString('pt-BR')}${x.voucher_code?` · Código: ${esc(x.voucher_code)}`:''}</small></div>`).join(''):'<p>Você ainda não solicitou nenhum gift card.</p>';
 if(refresh){saldoEl.textContent=`${fmt(Math.max(0,pointsEarned-pointsSpent))} pontos`;resumo.textContent=`${fmt(pointsEarned)} pontos recebidos · ${fmt(pointsSpent)} pontos utilizados`;}
}
async function resgatar(id,btn){
 if(!confirm('Deseja solicitar o resgate deste gift card? Os pontos serão reservados enquanto a solicitação estiver em análise.'))return;
 btn.disabled=true;const {error}=await supabase.rpc('cicla_redeem_gift_card',{p_gift_card_id:id});btn.disabled=false;
 if(error){alert(error.message||'Não foi possível solicitar o resgate.');return;}
 alert('Solicitação enviada! Acompanhe o status em “Meus resgates”.');await carregarResgates();await carregarHistorico();
}
form.addEventListener('submit',async e=>{
 e.preventDefault();entregaMsg.textContent='';
 const payload={p_collection_point_id:pontoSelect.value,p_material:document.getElementById('material').value,p_weight:Number(String(document.getElementById('peso').value).replace(',','.'))};
 if(!payload.p_collection_point_id||!Number.isFinite(payload.p_weight)||payload.p_weight<=0){entregaMsg.textContent='Preencha todos os campos corretamente.';return;}
 const btn=form.querySelector('button');btn.disabled=true;
 const {error}=await supabase.rpc('cicla_create_delivery_request',payload);btn.disabled=false;
 if(error){entregaMsg.textContent=error.message||'Não foi possível registrar a entrega.';return;}
 form.reset();entregaMsg.textContent='Entrega registrada! Aguarde a confirmação do peso pela empresa responsável.';await carregarHistorico();
});
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
iniciar();
