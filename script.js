// --- Dados combinados de Checklists ---
const checklistsData = {
    "1": [
        "FMC / MCDU Inicializado", 
        "Rota Inserida e Checada no FMS", 
        "Combustível Abastecido e Checado", 
        "APU Ligado", 
        "Portas Fechadas e Travadas",
        "📞 Copiar Informação ATIS Atual",
        "📞 Solicitar Autorização IFR (Clearance)"
    ],
    "2": [
        "Beacon Light ON", 
        "Portas Armadas (Crosscheck)",
        "Freio de Estacionamento Setado", 
        "📞 Solicitar Pushback e Acionamento",
        "Motores Acionados e Estabilizados", 
        "APU Desligado",
        "Flight Controls Checados", 
        "Taxi Light ON",
        "📞 Solicitar Instruções de Táxi"
    ],
    "3": [
        "Flaps Configurados para Decolagem", 
        "Auto Brake RTO", 
        "Transponder TA/RA (Modo Charlie)", 
        "Strobe & Landing Lights ON", 
        "📞 Reportar Pronto no Ponto de Espera",
        "📞 Confirmar Autorização de Decolagem"
    ],
    "4": [
        "Trem de Pouso UP", 
        "Flaps UP", 
        "Landing Lights OFF (Acima de 10.000ft)", 
        "Altímetro STD (No Nível de Transição)", 
        "📞 Reportar Subida ao Controle",
        "Monitoramento de Cruzeiro"
    ],
    "5": [
        "ATIS de Chegada Copiado",
        "Altímetro QNH Local Ajustado", 
        "Auto Brake Setado (Pouso)", 
        "📞 Solicitar / Confirmar Procedimento de Chegada",
        "Flaps Configurados para Pouso", 
        "Trem de Pouso DOWN", 
        "Speed Brakes Armados", 
        "📞 Confirmar Autorização de Pouso"
    ]
};

let currentTab = "1";

const tabs = document.querySelectorAll('.tab-btn');
const checklistContainer = document.getElementById('checklist-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

const inputs = [
    document.getElementById('input-atis'),
    document.getElementById('input-gate'),
    document.getElementById('input-runway'),
    document.getElementById('input-sid'),
    document.getElementById('input-transition'),
    document.getElementById('input-alt'),
    document.getElementById('input-taxi'),
    document.getElementById('simbrief-username'),
    document.getElementById('info-callsign'),
    document.getElementById('info-origin'),
    document.getElementById('info-dest'),
    document.getElementById('info-cruise'),
    document.getElementById('info-squawk')
].filter(Boolean);

const textPilot = document.getElementById('pilot-speaks');
const textReadback = document.getElementById('pilot-readback');

document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    renderChecklist(currentTab);
    updatePhraseology();
    updateFrequencies();
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            currentTab = e.target.getAttribute('data-tab');
            renderChecklist(currentTab);
            updatePhraseology();
        });
    });

    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                localStorage.setItem(input.id, input.value); 
                updatePhraseology();
                if (input.id === 'info-origin') updateFrequencies();
            });
        }
    });
});

// --- Função de Importação Direta do SimBrief (SEM PROXY) ---
async function importSimBrief() {
    const userField = document.getElementById('simbrief-username');
    const btn = document.querySelector('button[onclick*="importSimBrief"]') || event?.target;
    
    if (!userField || !userField.value.trim()) {
        alert('Por favor, digite seu ID ou Username do SimBrief!');
        return;
    }

    const userId = userField.value.trim();
    const originalText = btn ? btn.textContent : 'Importar';
    if (btn) btn.textContent = '⏳ Buscando...';

    // Detecta se digitou apenas números (ID) ou texto (Username)
    const paramName = /^\d+$/.test(userId) ? 'userid' : 'username';

    // URL DIRETA do SimBrief pedindo formato JSON, sem passar por site de terceiros
    const url = `https://www.simbrief.com/api/xml.fetcher.php?${paramName}=${userId}&json=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha na resposta do servidor');
        
        const dados = await response.json();

        // Se o SimBrief retornar erro (geralmente porque o plano não foi gerado)
        if (dados.fetch && dados.fetch.status === "Error") {
            alert('Plano de voo não encontrado. Certifique-se de que clicou no botão "GENERATE FLIGHT" no site do SimBrief.');
            if (btn) btn.textContent = originalText;
            return;
        }

        // Puxando os dados limpos do JSON
        const callsign = (dados.general?.icao_airline || "") + (dados.general?.flight_number || "");
        const origin = dados.origin?.icao_code || "";
        const dest = dados.destination?.icao_code || "";
        const cruise = dados.general?.initial_altitude || "";
        const squawk = dados.atc?.squawk || "";

        // --- NOVOS DADOS EXTRAÍDOS PARA A ABA OPERACIONAL ---
        const pistaOrigem = dados.origin?.plan_rwy || "";
        
        // A rota inteira vem num texto só, então pegamos a primeira palavra que é a SID
        const rotaCompleta = dados.general?.route || "";
        const sid = rotaCompleta.split(" ")[0] || ""; 
        // ----------------------------------------------------

        // Preenchendo a tela (Lateral Direita)
        setVal('info-callsign', callsign || "GLO1932");
        setVal('info-origin', origin);
        setVal('info-dest', dest);
        if (cruise) setVal('info-cruise', `FL${Math.round(parseInt(cruise) / 100)}`);
        setVal('info-squawk', squawk);

        // --- PREENCHENDO A TELA DE DADOS OPERACIONAIS ---
        if (pistaOrigem) setVal('input-runway', pistaOrigem);
        if (sid) setVal('input-sid', sid);
        // ------------------------------------------------

        // Salvando para não apagar se recarregar a página
        inputs.forEach(input => {
            if (input) localStorage.setItem(input.id, input.value);
        });

        updatePhraseology();
        updateFrequencies();
        
        if (btn) {
            btn.textContent = '✅ Importado!';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
        }

    } catch (error) {
        console.error("Erro no fetch:", error);
        alert('Erro ao conectar com o SimBrief. Verifique se o ID ou Username está correto.');
        if (btn) btn.textContent = originalText;
    }
}

// Função auxiliar segura para inputs
function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// --- Atualizar Frequências Dinâmicas baseadas na Origem ---
function updateFrequencies() {
    const originEl = document.getElementById('info-origin');
    const icao = originEl ? originEl.value.trim().toUpperCase() : "SBGR";
    const freqList = document.getElementById('freq-list-content');
    
    if (!freqList) return;

    const databaseFreqs = {
        "SBGR": [
            {name: "ATIS", num: "127.750"},
            {name: "DEL", num: "121.250"},
            {name: "GND", num: "121.500"},
            {name: "TWR", num: "118.400"},
            {name: "APP", num: "119.800"}
        ],
        "SBSP": [
            {name: "ATIS", num: "135.100"},
            {name: "GND", num: "121.700"},
            {name: "TWR", num: "118.050"},
            {name: "APP", num: "119.350"}
        ],
        "SBGL": [
            {name: "ATIS", num: "127.600"},
            {name: "DEL", num: "121.550"},
            {name: "GND", num: "121.900"},
            {name: "TWR", num: "118.100"},
            {name: "APP", num: "119.100"}
        ],
        "SBPA": [
            {name: "ATIS", num: "127.850"},
            {name: "GND", num: "121.750"},
            {name: "TWR", num: "118.300"},
            {name: "APP", num: "119.500"}
        ]
    };

    const freqs = databaseFreqs[icao] || [
        {name: "ATIS", num: "127.000"},
        {name: "GND", num: "121.900"},
        {name: "TWR", num: "118.100"},
        {name: "APP", num: "119.000"}
    ];

    freqList.innerHTML = '';
    freqs.forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="freq-name">${icao}_${f.name}</span> <span class="freq-num">${f.num}</span>`;
        freqList.appendChild(li);
    });
}

function renderChecklist(tabId) {
    const items = checklistsData[tabId] || [];
    if (!checklistContainer) return;
    
    checklistContainer.innerHTML = '';
    
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'check-item';
        
        const checkboxId = `check-${tabId}-${index}`;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        
        const savedState = localStorage.getItem(checkboxId);
        if (savedState === 'true') {
            checkbox.checked = true;
        }
        
        checkbox.addEventListener('change', (e) => {
            localStorage.setItem(e.target.id, e.target.checked);
            updateProgress();
        });
        
        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = item;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        checklistContainer.appendChild(div);
    });
    
    updateProgress();
}

function updateProgress() {
    const checkboxes = checklistContainer.querySelectorAll('input[type="checkbox"]');
    const total = checkboxes.length;
    if(total === 0) {
        if(progressBar) progressBar.style.width = '0%';
        if(progressText) progressText.textContent = '0%';
        return;
    }
    
    const checked = checklistContainer.querySelectorAll('input[type="checkbox"]:checked').length;
    const percentage = Math.round((checked / total) * 100);
    
    if(progressBar) progressBar.style.width = `${percentage}%`;
    if(progressText) progressText.textContent = `${percentage}%`;
}

function loadSavedData() {
    inputs.forEach(input => {
        if (input) {
            const savedValue = localStorage.getItem(input.id);
            if (savedValue !== null) {
                input.value = savedValue;
            }
        }
    });
}

function copyText(elementId) {
    const textarea = document.getElementById(elementId);
    if (!textarea) return;

    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        const btn = event?.target;
        if (!btn) return;
        const originalText = btn.textContent;
        
        btn.textContent = '✅ Copiado!';
        btn.style.backgroundColor = 'var(--accent-green)';
        btn.style.color = 'var(--bg-dark)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
            btn.style.color = '';
        }, 1500);
    });
}

function formatSquawk(squawk) {
    if (!squawk) return "____";
    return squawk.split('').join(' ');
}

function updatePhraseology() {
    const getValue = (id, fallback) => {
        const el = document.getElementById(id);
        return el && el.value.trim() !== '' ? el.value.toUpperCase() : fallback;
    };

    const atis = getValue('input-atis', '[ATIS]');
    const gate = getValue('input-gate', '[PORTÃO]');
    const rwy = getValue('input-runway', '[PISTA]');
    const sid = getValue('input-sid', '[SID]');
    
    const transInput = document.getElementById('input-transition');
    const trans = transInput && transInput.value.trim() !== '' ? transInput.value.toUpperCase() : '';
    
    const alt = getValue('input-alt', '[ALTITUDE]');
    const taxi = getValue('input-taxi', '[TAXIWAYS]');
    const callsign = getValue('info-callsign', '[CALLSIGN]');
    const dest = getValue('info-dest', '[DESTINO]');
    const origin = getValue('info-origin', '[ORIGEM]');
    const level = getValue('info-cruise', '[NÍVEL]');
    
    const squawkEl = document.getElementById('info-squawk');
    const squawk = squawkEl && squawkEl.value.trim() !== '' ? formatSquawk(squawkEl.value) : "____";
    
    const transicaoTexto = trans ? ` transição ${trans},` : "";

    let pilot = "";
    let readback = "";

    switch(currentTab) {
        case "1": 
            pilot = `${origin} Tráfego, ${callsign}, no portão ${gate}, com informação ${atis}, solicita autorização de tráfego IFR para ${dest}, nível planejado ${level}.`;
            readback = `Autorizado IFR para ${dest}, via ${sid}${transicaoTexto} pista ${rwy}, subida inicial ${alt}, transponder ${squawk}. ${callsign}.`;
            break;
            
        case "2": 
            pilot = `${origin} Solo, ${callsign}, solicita acionamento e pushback no portão ${gate}.\n\n(Após acionamento)\n${origin} Solo, ${callsign}, solicita instruções de táxi.`;
            readback = `Acionamento e pushback aprovados, ${callsign}.\n\nTáxi via ${taxi} para o ponto de espera da pista ${rwy}, ${callsign}.`;
            break;
            
        case "3": 
            pilot = `${origin} Torre, ${callsign}, no ponto de espera da pista ${rwy}, pronto para decolagem.`;
            readback = `Livre decolagem pista ${rwy}, vento [Graus/Nós], ${callsign}.`;
            break;
            
        case "4": 
            pilot = `Controle, ${callsign} decolado de ${origin}, cruzando [Altitude Atual] subindo para ${alt} na saída ${sid}.`;
            readback = `Subida autorizada para nível de cruzeiro ${level}, direto [Próximo Fixo], ${callsign}.`;
            break;
            
        case "5": 
            pilot = `Aproximação, ${callsign} descendo para [Altitude], com informação ${atis}, solicita vetoração / procedimento para pista ${rwy} em ${dest}.`;
            readback = `Ciente, autorizado procedimento [Nome/ILS] pista ${rwy}, reportará estabelecido, ${callsign}.\n\n(Com a Torre)\nLivre pouso pista ${rwy}, ${callsign}.`;
            break;
    }

    if (textPilot) textPilot.value = pilot;
    if (textReadback) textReadback.value = readback;
}

// --- Conversor Instantâneo de Unidades ---
const inHgInput = document.getElementById('conv-inhg');
const hPaInput = document.getElementById('conv-hpa');
const lbsInput = document.getElementById('conv-lbs');
const kgInput = document.getElementById('conv-kg');

if (inHgInput && hPaInput) {
    inHgInput.addEventListener('input', () => {
        if (inHgInput.value) {
            hPaInput.value = (parseFloat(inHgInput.value) * 33.8639).toFixed(0);
        } else {
            hPaInput.value = '';
        }
    });

    hPaInput.addEventListener('input', () => {
        if (hPaInput.value) {
            inHgInput.value = (parseFloat(hPaInput.value) / 33.8639).toFixed(2);
        } else {
            inHgInput.value = '';
        }
    });
}

if (lbsInput && kgInput) {
    lbsInput.addEventListener('input', () => {
        if (lbsInput.value) {
            kgInput.value = (parseFloat(lbsInput.value) * 0.453592).toFixed(0);
        } else {
            kgInput.value = '';
        }
    });

    kgInput.addEventListener('input', () => {
        if (kgInput.value) {
            lbsInput.value = (parseFloat(kgInput.value) / 0.453592).toFixed(0);
        } else {
            lbsInput.value = '';
        }
    });
}

// --- Sistema de Redimensionamento do Painel Direito ---
const resizer = document.getElementById('resizer');
let isResizing = false;

if (resizer) {
    const savedWidth = localStorage.getItem('panel-width');
    if (savedWidth) {
        document.documentElement.style.setProperty('--right-panel-width', savedWidth);
    }

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let newWidth = window.innerWidth - e.clientX;
        if (newWidth < 260) newWidth = 260;
        if (newWidth > 600) newWidth = 600;
        document.documentElement.style.setProperty('--right-panel-width', `${newWidth}px`);
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            const finalWidth = getComputedStyle(document.documentElement).getPropertyValue('--right-panel-width');
            localStorage.setItem('panel-width', finalWidth.trim());
        }
    });
}
// --- Função para Limpar Voo ---
function limparVoo() {
    if (confirm("Tem certeza que deseja apagar todos os dados e checklists do voo atual?")) {
        
        // 1. Salva o ID do SimBrief antes de apagar a memória
        const simbriefInput = document.getElementById('simbrief-username');
        const savedSimbriefId = simbriefInput ? simbriefInput.value : '';

        // 2. Limpa toda a memória do navegador
        localStorage.clear();
        
        // 3. Devolve o ID do SimBrief para a memória
        if (savedSimbriefId) {
            localStorage.setItem('simbrief-username', savedSimbriefId);
        }
        
        // 4. Limpa TODOS os campos de texto e número da página, EXCETO o SimBrief
        const todosOsCampos = document.querySelectorAll('input[type="text"], input[type="number"]');
        todosOsCampos.forEach(campo => {
            if (campo.id !== 'simbrief-username') {
                campo.value = '';
            }
        });
        
        // 5. Desmarca todos os checklists
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        // 6. Atualiza as barras e textos da fraseologia
        updateProgress();
        updatePhraseology();
        
        // 7. Limpa a lista de frequências
        const freqList = document.getElementById('freq-list-content');
        if (freqList) freqList.innerHTML = '';
        
        alert("Voo limpo com sucesso! O seu ID do SimBrief foi mantido.");
    }
}
