
const formLogin = document.getElementById('formLogin');
const titulo = document.getElementById('titulo');
const subtitulo = document.getElementById('subtitulo');
const mensagem = document.getElementById('mensagem');
const btnLogin = document.getElementById('btnLogin');
const btnCadastro = document.getElementById('btnCadastro');
const btnEnviar = document.getElementById('btnEnviar');
const campoNome = document.getElementById('campoNome');
const campoCnpj = document.getElementById('campoCnpj');
const nome = document.getElementById('nome');
const email = document.getElementById('email');
const senha = document.getElementById('senha');
const nomeEmpresa = document.getElementById('nomeEmpresa');
const cnpj = document.getElementById('cnpj');
const botoesTipo = document.querySelectorAll('.tipo');

let tipoConta = 'usuario';
let modo = 'login';
let clienteSupabasePromise;

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.style.color = erro ? '#b42318' : '';
}

function atualizarFormulario() {
    const cadastrando = modo === 'cadastro';
    const empresa = tipoConta === 'empresa';

    campoNome.classList.toggle('escondido', !cadastrando);
    campoCnpj.classList.toggle('escondido', !(cadastrando && empresa));

    nome.disabled = !cadastrando;
    nome.required = cadastrando;
    nomeEmpresa.disabled = !(cadastrando && empresa);
    nomeEmpresa.required = cadastrando && empresa;
    cnpj.disabled = !(cadastrando && empresa);
    cnpj.required = cadastrando && empresa;

    btnLogin.classList.toggle('ativo', !cadastrando);
    btnCadastro.classList.toggle('ativo', cadastrando);
    btnLogin.setAttribute('aria-pressed', String(!cadastrando));
    btnCadastro.setAttribute('aria-pressed', String(cadastrando));

    titulo.textContent = cadastrando ? 'Crie sua conta no CICLA!' : 'Bem-vindo ao CICLA!';
    subtitulo.textContent = cadastrando
        ? 'Preencha seus dados para participar.'
        : 'Escolha seu tipo de conta para continuar.';
    btnEnviar.textContent = cadastrando ? 'Criar conta' : 'Entrar';
    senha.autocomplete = cadastrando ? 'new-password' : 'current-password';
    mostrarMensagem('');
}

botoesTipo.forEach((botao) => {
    botao.addEventListener('click', (evento) => {
        evento.preventDefault();
        tipoConta = botao.dataset.tipo === 'empresa' ? 'empresa' : 'usuario';
        botoesTipo.forEach((outroBotao) => {
            const selecionado = outroBotao === botao;
            outroBotao.classList.toggle('selecionado', selecionado);
            outroBotao.setAttribute('aria-pressed', String(selecionado));
        });
        atualizarFormulario();
    });
});

btnLogin.addEventListener('click', (evento) => {
    evento.preventDefault();
    modo = 'login';
    atualizarFormulario();
});

btnCadastro.addEventListener('click', (evento) => {
    evento.preventDefault();
    modo = 'cadastro';
    atualizarFormulario();
});

async function obterSupabase() {
    if (!clienteSupabasePromise) {
        clienteSupabasePromise = import('../supabase-config.js')
            .then((modulo) => modulo.supabase);
    }
    return clienteSupabasePromise;
}

formLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensagem('');
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Aguarde...';

    try {
        const supabase = await obterSupabase();
        const emailDigitado = email.value.trim().toLowerCase();
        const senhaDigitada = senha.value;
        if (modo === 'cadastro') {
            await cadastrarConta(supabase, emailDigitado, senhaDigitada);
        } else {
            await entrarNaConta(supabase, emailDigitado, senhaDigitada);
        }
    } catch (erro) {
        console.error('Erro no CICLA:', erro);
        mostrarMensagem(
            'Não foi possível conectar ao serviço de login. Abra o projeto por um servidor local (por exemplo, Live Server) e confira sua conexão.',
            true
        );
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = modo === 'cadastro' ? 'Criar conta' : 'Entrar';
    }
});

async function cadastrarConta(supabase, emailDigitado, senhaDigitada) {
    const nomeDigitado = nome.value.trim();
    const nomeEmpresaDigitado = nomeEmpresa.value.trim();
    const cnpjDigitado = cnpj.value.replace(/\D/g, '');

    if (!nomeDigitado) {
        mostrarMensagem('Digite seu nome completo.', true);
        return;
    }
    if (senhaDigitada.length < 6) {
        mostrarMensagem('A senha precisa ter pelo menos 6 caracteres.', true);
        return;
    }
    if (tipoConta === 'empresa' && (!nomeEmpresaDigitado || cnpjDigitado.length !== 14)) {
        mostrarMensagem('Preencha o nome da empresa e um CNPJ com 14 números.', true);
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email: emailDigitado,
        password: senhaDigitada,
        options: {
            data: {
                nome: nomeDigitado,
                tipo: tipoConta,
                nomeEmpresa: tipoConta === 'empresa' ? nomeEmpresaDigitado : '',
                cnpj: tipoConta === 'empresa' ? cnpjDigitado : ''
            }
        }
    });

    if (error) {
        mostrarMensagem(traduzirErro(error.message), true);
        return;
    }

    if (tipoConta === 'empresa') {
        mostrarMensagem(data.session
            ? 'Conta criada. O cadastro da empresa deve ficar pendente de aprovação.'
            : 'Cadastro criado. Confirme o e-mail para ativar a conta; a empresa deverá aguardar aprovação.');
    } else {
        mostrarMensagem(data.session
            ? 'Conta criada! Redirecionando...'
            : 'Cadastro criado! Confira seu e-mail para confirmar a conta e depois entre no CICLA.');
    }

    if (data.session && data.user) {
        salvarSessao(data.user);
        window.location.href = tipoConta === 'empresa'
            ? '../empresa/empresa.html'
            : '../index/index.html';
    } else {
        modo = 'login';
        atualizarFormulario();
    }
}

async function entrarNaConta(supabase, emailDigitado, senhaDigitada) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailDigitado,
        password: senhaDigitada
    });

    if (error) {
        mostrarMensagem(traduzirErro(error.message), true);
        return;
    }

    const tipoSalvo = data.user?.user_metadata?.tipo || 'usuario';
    if (tipoSalvo !== tipoConta) {
        await supabase.auth.signOut();
        mostrarMensagem('Esta conta não corresponde ao tipo selecionado.', true);
        return;
    }

    salvarSessao(data.user);
    window.location.href = tipoSalvo === 'empresa'
        ? '../empresa/empresa.html'
        : '../index/index.html';
}

function salvarSessao(usuario) {
    const meta = usuario.user_metadata || {};
    sessionStorage.setItem('ciclaSessao', JSON.stringify({
        nome: meta.nome || usuario.email,
        email: usuario.email,
        tipo: meta.tipo || 'usuario',
        nomeEmpresa: meta.nomeEmpresa || ''
    }));
}

function traduzirErro(texto) {
    if (/invalid login credentials/i.test(texto)) return 'E-mail ou senha incorretos.';
    if (/user already registered/i.test(texto)) return 'Este e-mail já está cadastrado. Tente entrar.';
    if (/password should be at least/i.test(texto)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/email not confirmed/i.test(texto)) return 'Confirme seu e-mail antes de entrar.';
    if (/duplicate key|unique constraint/i.test(texto)) return 'Já existe uma empresa cadastrada com esses dados. Confira o CNPJ.';
    return texto;
}

atualizarFormulario();
