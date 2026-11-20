import {supabase} from '../supabase-config.js';
const mural=document.getElementById('mural'),form=document.getElementById('formPost'),msg=document.getElementById('formMsg');
const pesquisa=document.getElementById('pesquisa'),filtro=document.getElementById('filtro');
let user=null,posts=[];
const catLabel={reciclagem:'♻️ RECICLAGEM',sustentabilidade:'🌱 SUSTENTABILIDADE',descarte:'🗑️ DESCARTE CORRETO'};
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
 const q=pesquisa.value.trim().toLocaleLowerCase('pt-BR'),c=filtro.value;
 const arr=posts.filter(p=>(c==='todos'||p.category===c)&&`${p.title} ${p.content} ${p.author_name}`.toLocaleLowerCase('pt-BR').includes(q));
 mural.innerHTML=arr.length?arr.map(p=>`<article class="post"><div class="post-topo"><div class="avatar">${esc((p.author_name||'C').slice(0,1).toUpperCase())}</div><div><strong>${esc(p.author_name||'Colaborador CICLA')}</strong><small>${new Date(p.created_at).toLocaleString('pt-BR')}</small></div></div><div class="post-conteudo"><span class="categoria">${catLabel[p.category]||'TUTORIAL'}</span><h2>${esc(p.title)}</h2><p>${esc(p.content)}</p></div><div class="post-footer"><span>${Number(p.like_count||0)} curtida(s)</span><button class="${p.liked_by_me?'curtiu':''}" data-like="${p.id}">${p.liked_by_me?'♥ Curtido':'♡ Gostei'}</button></div></article>`).join(''):'<div class="vazio">Nenhum tutorial encontrado. Seja a primeira pessoa a compartilhar uma dica!</div>';
 mural.querySelectorAll('[data-like]').forEach(b=>b.addEventListener('click',()=>curtir(b.dataset.like,b)));
}
async function carregar(){
 const {data:{session}}=await supabase.auth.getSession();user=session?.user||null;
 const {data,error}=await supabase.rpc('cicla_list_tutorial_posts');
 if(error){console.error(error);mural.innerHTML='<div class="vazio">Não foi possível carregar as publicações. Execute a configuração SQL do CICLA.</div>';return;}
 posts=data||[];render();
}
form.addEventListener('submit',async e=>{
 e.preventDefault();msg.textContent='';
 if(!user){msg.innerHTML='Para publicar, <a href="../login/login.html">entre na sua conta</a>.';return;}
 const title=document.getElementById('titulo').value.trim(),content=document.getElementById('conteudoPost').value.trim(),category=document.getElementById('categoria').value;
 if(title.length<4||content.length<10){msg.textContent='Escreva um título e uma descrição um pouco mais completos.';return;}
 const btn=form.querySelector('button');btn.disabled=true;
 const author_name=user.user_metadata?.nome||user.user_metadata?.nomeEmpresa||user.email||'Colaborador CICLA';
 const {error}=await supabase.from('tutorial_posts').insert({author_id:user.id,author_name,title,category,content});
 btn.disabled=false;
 if(error){msg.textContent='Não foi possível publicar. Verifique a configuração do banco.';console.error(error);return;}
 form.reset();msg.textContent='Tutorial publicado!';await carregar();
});
async function curtir(id,btn){
 if(!user){alert('Entre na sua conta para curtir um tutorial.');location.href='../login/login.html';return;}
 btn.disabled=true;const {error}=await supabase.rpc('cicla_toggle_tutorial_like',{p_post_id:id});btn.disabled=false;
 if(error){alert('Não foi possível registrar sua curtida.');console.error(error);return;}await carregar();
}
pesquisa.addEventListener('input',render);filtro.addEventListener('change',render);carregar();
