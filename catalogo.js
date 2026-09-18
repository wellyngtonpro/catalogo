let modoBusca = false
let paginaAtual = 0
let limite = 27
let carregando = false
let fimCatalogo = false
let mostrandoFavoritos = false


const SUPABASE_URL = "https://luioozftycjmhluxveqd.supabase.co"
const SUPABASE_KEY = "sb_publishable_v0k4E0nSI0gizXL0OQfmpg_MXyRPCuO"

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let catalogoGlobal = []
let carrinho = []
let produtoAtual = null
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || []

// =========================
// CATÁLOGO
// =========================
function mostrarSkeletonInicial() {

    let div = document.getElementById("catalogo")

    for (let i = 0; i < 30; i++) {
        div.innerHTML += criarSkeletonCard()
    }
}

async function carregarCatalogo() {

    if (carregando || fimCatalogo) return

    carregando = true

    let inicio = paginaAtual * limite
    let fim = inicio + limite - 1

    let { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .order("codigo", { ascending: true })
        .range(inicio, fim)

    if (error) {
        console.error(error)
        carregando = false
        return
    }

    if (!data.length) {
        fimCatalogo = true
        carregando = false
        return
    }

    catalogoGlobal = [...catalogoGlobal, ...data]

    if (paginaAtual === 0) {
        document.getElementById("catalogo").innerHTML = ""
    }

    renderCatalogoIncremental(data)

    paginaAtual++
    carregando = false

    carregarImagensLentas(data)
}
// =========================
// RENDER
// =========================
function renderCatalogo(lista) {

    let div = document.getElementById("catalogo")
    if (!div) return

    div.innerHTML = ""

    lista.forEach(p => {

        if (!p.codigo || !p.nome) return

        let badge = p.badge || ""
        let badgeTexto = ""

        if (badge === "PROMOCAO") badgeTexto = "PROMOÇÃO"
        if (badge === "NOVO") badgeTexto = "NOVO"
        if (badge === "MAIS_VENDIDO") badgeTexto = "MAIS VENDIDO"

        let isFav = favoritos.includes(p.codigo)

        div.innerHTML += `
        <div class="card-produto" onclick="abrirModal('${p.codigo}')">

            ${badgeTexto ? `<div class="badge">${badgeTexto}</div>` : ""}

            <div class="favorito" onclick="toggleFavorito(event,'${p.codigo}')">
                ${isFav ? "❤️" : "🤍"}
            </div>

            ${p.imagem ? `<img src="${p.imagem}" class="card-img">` : ""}

            <div class="card-info">
                <div class="card-nome">${p.nome}</div>

                <div class="card-preco">
                    R$ ${Number(p.preco).toLocaleString("pt-BR", {
            minimumFractionDigits: 2
        })}
                </div>
            </div>

        </div>
        `
    })
}

function renderCatalogoIncremental(lista) {

    let div = document.getElementById("catalogo")

    let html = ""

    lista.forEach(p => {

        let badge = p.badge || ""
        let badgeTexto = ""

        if (badge === "PROMOCAO") badgeTexto = "PROMOÇÃO"
        if (badge === "NOVO") badgeTexto = "NOVO"
        if (badge === "MAIS_VENDIDO") badgeTexto = "MAIS VENDIDO"

        let isFav = favoritos.includes(p.codigo)

        html += `
        <div class="card-produto" onclick="abrirModal('${p.codigo}')">

            ${badgeTexto ? `<div class="badge">${badgeTexto}</div>` : ""}

            <div class="favorito" onclick="toggleFavorito(event,'${p.codigo}')">
                ${isFav ? "❤️" : "🤍"}
            </div>

            <div class="img-container skeleton" id="img-${p.codigo}"></div>

            <div class="card-info">
                <div class="card-nome">${p.nome}</div>
                <div class="card-preco">
                    R$ ${Number(p.preco).toLocaleString("pt-BR", {
            minimumFractionDigits: 2
        })}
                </div>
            </div>

        </div>
        `
    })

    div.innerHTML += html
}

function carregarImagensLentas(lista) {

    let i = 0

    function carregarLote() {

        let lote = lista.slice(i, i + 5)

        lote.forEach(p => {

            let container = document.getElementById(`img-${p.codigo}`)

            if (!container) return

            let img = new Image()
            img.src = p.imagem
            if (!p.imagem) return

            img.className = "card-img"

            img.onload = () => {
                container.classList.remove("skeleton")
                container.innerHTML = ""
                container.appendChild(img)
            }
        })

        i += 5

        if (i < lista.length) {
            setTimeout(carregarLote, 300)
        }
    }

    carregarLote()
}

let timeoutScroll

window.addEventListener("scroll", () => {

    // 🔥 trava scroll quando estiver buscando OU em favoritos
    if (modoBusca || mostrandoFavoritos) return

    clearTimeout(timeoutScroll)

    timeoutScroll = setTimeout(() => {

        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
            carregarCatalogo()
        }

    }, 100)
})

// =========================
// BUSCA
// =========================
async function filtrarCatalogo() {

    let busca = document.getElementById("busca").value.toLowerCase()

    if (!busca) {
        modoBusca = false
        resetarCatalogo()
        carregarCatalogo()
        return
    }

    modoBusca = true

    // 🔥 BUSCA NO BANCO (GLOBAL)
    let { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .or(`nome.ilike.%${busca}%,codigo.ilike.%${busca}%`)
        .limit(50)

    if (error) {
        console.error(error)
        return
    }
    catalogoGlobal = data
    renderCatalogo(data)
}


// =========================
// FAVORITOS
// =========================
async function carregarFavoritosDoBanco() {

    if (favoritos.length === 0) {
        renderCatalogo([])
        return
    }

    let { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .in("codigo", favoritos)

    if (error) {
        console.error(error)
        return
    }
    catalogoGlobal = data
    renderCatalogo(data)
}

function toggleFavorito(event, codigo) {

    event.stopPropagation() // 🔥 ISSO RESOLVE

    let index = favoritos.indexOf(codigo)

    if (index === -1) {
        favoritos.push(codigo)
    } else {
        favoritos.splice(index, 1)
    }

    localStorage.setItem("favoritos", JSON.stringify(favoritos))

    // opcional: atualizar UI
    renderCatalogo(catalogoGlobal)
}

function toggleFiltroFavoritos() {

    mostrandoFavoritos = !mostrandoFavoritos

    if (mostrandoFavoritos) {
        carregarFavoritosDoBanco() // 🔥 AQUI
    } else {
        resetarCatalogo()
        carregarCatalogo()
    }
}

function mostrarFavoritos() {

    let filtrados = catalogoGlobal.filter(p =>
        favoritos.includes(p.codigo)
    )

    renderCatalogo(filtrados)
}



function resetarCatalogo() {
    paginaAtual = 0
    fimCatalogo = false
    catalogoGlobal = []
    if (carregando) return
    document.getElementById("catalogo").innerHTML = ""
}
// =========================
// MODAL
// =========================
function abrirModal(codigo) {

    let produto = catalogoGlobal.find(p => p.codigo == codigo)

    // 🔥 fallback caso não esteja no global
    if (!produto) {
        console.warn("Produto não encontrado no cache, buscando no banco...")

        supabaseClient
            .from("produtos")
            .select("*")
            .eq("codigo", codigo)
            .single()
            .then(({ data, error }) => {

                if (error || !data) {
                    console.error("Erro ao buscar produto", error)
                    return
                }

                produtoAtual = data
                abrirModalRender(data)
            })

        return
    }

    produtoAtual = produto
    abrirModalRender(produto)
}

function abrirModalRender(produto) {

    document.getElementById("modalImg").src = produto.imagem || ""
    document.getElementById("modalNome").innerText = produto.nome
    document.getElementById("modalPreco").innerText =
        "R$ " + Number(produto.preco).toFixed(2)

    document.getElementById("modalProduto").style.display = "block"
}

function fecharModal() {
    document.getElementById("modalProduto").style.display = "none"
}

// =========================
// CARRINHO
// =========================
function toggleCarrinho() {
    document.getElementById("carrinho").classList.toggle("ativo")
}

function addCarrinhoModal() {

    if (!produtoAtual) return

    carrinho.push(produtoAtual)

    renderCarrinho()

    fecharModal()

    salvarCarrinho()
}

function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(carrinho))
}

function carregarCarrinho() {
    let salvo = localStorage.getItem("carrinho")
    if (salvo) carrinho = JSON.parse(salvo)
}

function renderCarrinho() {

    let div = document.getElementById("listaCarrinho")
    if (!div) return

    let agrupado = {}

    carrinho.forEach(p => {
        if (!agrupado[p.codigo]) {
            agrupado[p.codigo] = { ...p, qt: 1 }
        } else {
            agrupado[p.codigo].qt++
        }
    })

    let lista = Object.values(agrupado)

    let subtotal = 0
    div.innerHTML = ""

    lista.forEach(p => {

        subtotal += p.preco * p.qt

        div.innerHTML += `
        <div class="item-carrinho">
            <img src="${p.imagem || ''}" class="item-img">

            <div class="item-info">
                <div class="item-nome">${p.nome}</div>
                <div class="item-preco">R$ ${p.preco}</div>
            </div>

            <div class="item-acoes">
                <div onclick="removerProdutoCarrinho('${p.codigo}')">✖</div>

                <div class="controle-qt">
                    <button onclick="alterarQt('${p.codigo}', -1)">-</button>
                    <span>${p.qt}</span>
                    <button onclick="alterarQt('${p.codigo}', 1)">+</button>
                </div>
            </div>
        </div>
        `
    })

    document.getElementById("subtotalCarrinho").innerText =
        "R$ " + subtotal.toFixed(2)

    document.getElementById("qtdItens").innerText =
        lista.length
}

function alterarQt(codigo, delta) {

    let index = carrinho.findIndex(p => p.codigo == codigo)

    if (delta === -1) {
        carrinho.splice(index, 1)
    } else {
        carrinho.push(carrinho[index])
    }

    salvarCarrinho()
    renderCarrinho()
}

function removerProdutoCarrinho(codigo) {
    carrinho = carrinho.filter(p => p.codigo != codigo)
    salvarCarrinho()
    renderCarrinho()
}

function confirmarLimparCarrinho() {

    if (confirm("Esvaziar Carrinho?")) {
        carrinho = []
        renderCarrinho()

        salvarCarrinho()
    }
}

// =========================
// FINALIZAR
// =========================
function abrirFinalizar() {

    if (carrinho.length === 0) {
        alert("Carrinho vazio")
        return
    }

    // 🔥 FECHA O CARRINHO
    if (typeof fecharCarrinho === "function") {
        fecharCarrinho()
    }

    document.getElementById("modalFinalizar").style.display = "block"
}

function fecharCarrinho() {
    document.getElementById("carrinho").classList.remove("ativo")
}

function fecharFinalizar() {
    document.getElementById("modalFinalizar").style.display = "none"

    // opcional
    if (typeof abrirCarrinho === "function") {
        abrirCarrinho()
    }
}

async function enviarPedido() {

    let nome = document.getElementById("clienteNome").value
    let telefone = document.getElementById("clienteTelefone").value

    if (!nome || !telefone) {
        alert("Preencha seus dados")
        return
    }

    // agrupar carrinho
    let agrupado = {}

    carrinho.forEach(p => {
        if (!agrupado[p.codigo]) {
            agrupado[p.codigo] = { ...p, qt: 1 }
        } else {
            agrupado[p.codigo].qt++
        }
    })

    let itens = Object.values(agrupado)

    let total = 0

    itens.forEach(i => {
        total += i.preco * i.qt
    })

    // 🚀 ENVIO PRO SUPABASE
    let { error } = await supabaseClient
        .from("pedidos")
        .insert([{
            cliente: nome,
            telefone: telefone,
            itens: itens,
            total: total,
            status: "novo"
        }])

    if (error) {
        alert("Erro ao enviar pedido")
        console.error(error)
        return
    }

    // limpar tudo
    carrinho = []
    salvarCarrinho()
    renderCarrinho()
    fecharFinalizar()

    alert("Pedido enviado com sucesso! 🎉")
}

document.addEventListener("DOMContentLoaded", () => {

    mostrarSkeletonInicial()

    carregarCatalogo()

    carregarCarrinho()
    renderCarrinho()
    pegarClienteURL()
})


/*link copiar */

function gerarLinkCatalogo(event) {
    /*let link = window.location.origin + "/catalogo/"*/
    let link = "https://wellyngtonpro.github.io/catalogo/"

    navigator.clipboard.writeText(link)

    let btn = event.target
    let textoOriginal = btn.innerText

    btn.innerText = "✅ Copiado!"

    setTimeout(() => {
        btn.innerText = textoOriginal
    }, 2000)
}

function pegarClienteURL() {

    let params = new URLSearchParams(window.location.search)

    let cliente = params.get("cliente")

    if (cliente) {
        document.getElementById("clienteNome").value = cliente
    }
}


/**link copiar */


/*compartilhar whatsapp */

function compartilharWhatsApp() {

    /*let link = window.location.origin + "/catalogo/"*/
    let link = "https://wellyngtonpro.github.io/catalogo/"

    let mensagem =
        `*Catalogo Bombons e Companhia*

    Veja todos os produtos aqui:
    ${link}

Entre em contato com Wellyngton para ser atendido ou receber o *aplicativo* do catalogo: (98)98123-7333

Qualquer dúvida me chama!`

    let url = "https://wa.me/?text=" + encodeURIComponent(mensagem)

    window.open(url, "_blank")
}


//=================
//CARDS CATALOGOS
//=================
function criarSkeletonCard() {
    return `
    <div class="card-produto">
        <div class="skeleton skeleton-img"></div>

        <div class="card-info">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:80%"></div>
            <div class="skeleton skeleton-preco"></div>
        </div>
    </div>
    `
}



