import { supabase } from '../supabase-config.js';
const linkConta=document.getElementById('linkConta');
const areaConta=document.getElementById('areaConta');
async function atualizarConta(){
 const {data:{session}}=await supabase.auth.getSession();
 const botaoTopo=document.querySelector('.btn-colaborador');
 if(!session?.user){linkConta.href='../login/login.html';linkConta.innerHTML='<i class="fa-solid fa-user"></i> Entrar';botaoTopo.href='../login/login.html';botaoTopo.textContent='Seja colaborador';document.getElementById('botaoSair')?.remove();return;}
 const u=session.user,m=u.user_metadata||{},empresa=m.tipo==='empresa';
 const nome=empresa?(m.nomeEmpresa||m.nome||u.email):(m.nome||u.email);
 linkConta.href=empresa?'../empresa/empresa.html':'../beneficios/beneficios.html';
 linkConta.textContent=`Olá, ${nome}`;
 botaoTopo.href=empresa?'../empresa/empresa.html':'../beneficios/beneficios.html';
 botaoTopo.textContent=empresa?'Área da empresa':'Minha conta';
 let sair=document.getElementById('botaoSair');
 if(!sair){sair=document.createElement('button');sair.id='botaoSair';sair.type='button';sair.textContent='Sair';areaConta.append(sair);}
 sair.onclick=async()=>{sair.disabled=true;const {error}=await supabase.auth.signOut();if(error){sair.disabled=false;alert('Não foi possível sair. Tente novamente.');return;}location.reload();};
}
atualizarConta();
supabase.auth.onAuthStateChange(()=>atualizarConta());
