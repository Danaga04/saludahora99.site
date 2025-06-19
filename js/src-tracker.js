// Conteúdo para src-tracker.js
(function() {
    'use strict';
    
    const CONFIG = {
        apiUrl: '/api/sales', // Ajustado para o endpoint da Vercel (relativo)
        authToken: null,                         // 🔒 SE TIVER TOKEN, COLOQUE AQUI
        debug: false                             // ✅ DESABILITADO EM PRODUÇÃO
    };

    function capturarSRC() {
        const params = new URLSearchParams(window.location.search);
        const src = params.get('src');
        if (src) {
            try {
                localStorage.setItem('tracking_src', src);
                sessionStorage.setItem('tracking_src', src);
                document.cookie = `tracking_src=${src}; path=/; max-age=604800; SameSite=Lax`;
            } catch (e) {
                if (CONFIG.debug) console.error("Erro ao salvar SRC:", e);
            }
            if (CONFIG.debug) console.log('SRC Capturado:', src);
        }
        return src;
    }

    function recuperarSRC() {
        let src = new URLSearchParams(window.location.search).get('src');
        if (!src) {
            try {
                src = localStorage.getItem('tracking_src');
                if (!src) src = sessionStorage.getItem('tracking_src');
                if (!src) {
                    const match = document.cookie.match(/tracking_src=([^;]+)/);
                    src = match ? match[1] : null;
                }
            } catch (e) {
                 if (CONFIG.debug) console.error("Erro ao recuperar SRC:", e);
                 return null;
            }
        }
        return src;
    }

    async function enviarVenda(dadosVenda) {
        const src = recuperarSRC();
        if (!src) {
            if (CONFIG.debug) console.log('Sem SRC ativo. Venda não rastreada via SRC.');
            return null;
        }

        const payload = {
            src: src,
            amount: dadosVenda.valor,
            orderId: dadosVenda.orderId,
            productName: dadosVenda.produto,
            customerEmail: dadosVenda.email || null,
            customerName: dadosVenda.nome || null,
            customerPhone: dadosVenda.telefone || null,
            paymentMethod: dadosVenda.metodoPagamento || 'PIX',
            pixCode: dadosVenda.codigoPIX || null // Se tiver o código PIX usado
        };

        if (CONFIG.debug) console.log('Enviando dados da venda para SRC:', payload);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (CONFIG.authToken) {
                headers['Authorization'] = `Bearer ${CONFIG.authToken}`;
            }
            const response = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resultado = await response.json();
                if (CONFIG.debug) console.log('Venda registrada no SRC com sucesso:', resultado);
                return resultado;
            } else {
                if (CONFIG.debug) console.error('Erro ao registrar no SRC:', response.status, await response.text());
                return null;
            }
        } catch (error) {
            if (CONFIG.debug) console.error('Falha na comunicação com API SRC:', error);
            return null;
        }
    }

    window.SRCTracker = {
        init: function() {
            const src = capturarSRC() || recuperarSRC();
            if (CONFIG.debug) {
                console.log('SRCTracker Inicializado. SRC Atual:', src || 'Nenhum');
                if (!src) console.log('Para testar, adicione ?src=SEU_CODIGO na URL.');
            }
            return src;
        },
        getSRC: function() {
            return recuperarSRC();
        },
        registrarVenda: async function(dados) {
            // Exemplo: SRCTracker.registrarVenda({ valor: 100.50, orderId: 'PIX123', produto: 'Curso Online' });
            if (!dados || typeof dados.valor === 'undefined' || typeof dados.orderId === 'undefined' || typeof dados.produto === 'undefined') {
                if (CONFIG.debug) console.error('Dados insuficientes para registrar venda:', dados);
                return Promise.resolve(null);
            }
            return enviarVenda(dados);
        },
        debugInfo: function(elementId) {
            if (!CONFIG.debug) return;
            const el = document.getElementById(elementId);
            if (el) {
                const src = recuperarSRC();
                el.innerHTML = `<strong>SRC Info (Debug):</strong> ${src ? `Ativo - ${src}` : 'Nenhum SRC detectado'}`;
                el.style.cssText = `
                    padding: 8px; margin: 10px 0; border-radius: 4px;
                    background-color: ${src ? '#e6ffed' : '#fff0f0'};
                    border: 1px solid ${src ? '#b7ebc0' : '#ffd6d6'};
                    color: ${src ? '#006422' : '#a02f2f'}; font-size: 12px;
                `;
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.SRCTracker.init);
    } else {
        window.SRCTracker.init();
    }
})(); 