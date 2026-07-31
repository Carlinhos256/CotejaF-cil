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
let currentNetwork = "IVAO";
let currentPhase = "origin";

const tabs = document.querySelectorAll('.tab-btn');
const checklistContainer = document.getElementById('checklist-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

const inputs = [
    document.getElementById('input-atis'),
    document.getElementById('input-gate'),
    document.getElementById('input-pushdir'),
    document.getElementById('input-runway'),
    document.getElementById('input-sid'),
    document.getElementById('input-transition'),
    document.getElementById('input-alt'),
    document.getElementById('input-taxi'),
    document.getElementById('input-star'),
    document.getElementById('input-dest-transition'),
    document.getElementById('input-proc-type'),
    document.getElementById('input-proc-sub'),
    document.getElementById('input-dest-runway'),
    document.getElementById('input-adjustment'),
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

function switchPhase(phase) {
    currentPhase = phase;
    document.getElementById('btn-phase-origin').classList.toggle('active', phase === 'origin');
    document.getElementById('btn-phase-dest').classList.toggle('active', phase === 'dest');

    document.getElementById('form-origin-inputs').style.display = phase === 'origin' ? 'grid' : 'none';
    document.getElementById('form-dest-inputs').style.display = phase === 'dest' ? 'grid' : 'none';
}

function setNetwork(net) {
    currentNetwork = net;
    document.getElementById('net-ivao').classList.toggle('active', net === 'IVAO');
    document.getElementById('net-vatsim').classList.toggle('active', net === 'VATSIM');
    
    const labelNet = document.getElementById('current-net-label');
    if(labelNet) labelNet.textContent = net;

    updateFrequencies();
}

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

    const paramName = /^\d+$/.test(userId) ? 'userid' : 'username';
    const url = `https://www.simbrief.com/api/xml.fetcher.php?${paramName}=${userId}&json=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha na resposta do servidor');
        
        const dados = await response.json();

        if (dados.fetch && dados.fetch.status === "Error") {
            alert('Plano de voo não encontrado no SimBrief. Certifique-se de gerar o voo.');
            if (btn) btn.textContent = originalText;
            return;
        }

        const callsign = (dados.general?.icao_airline || "") + (dados.general?.flight_number || "");
        const origin = dados.origin?.icao_code || "";
        const dest = dados.destination?.icao_code || "";
        const cruise = dados.general?.initial_altitude || "";
        const squawk = dados.atc?.squawk || "";
        
        const pistaOrigem = dados.origin?.plan_rwy || "";
        const pistaDest = dados.destination?.plan_rwy || "";
        
        const rotaCompleta = dados.general?.route || "";
        const pedacosRota = rotaCompleta.split(" ").filter(Boolean);

        const sidOrigem = dados.origin?.plan_sid || (pedacosRota.length > 0 ? pedacosRota[0] : "");
        const transOrigem = pedacosRota.length > 1 ? pedacosRota[1] : "";

        const starDest = dados.destination?.plan_star || (pedacosRota.length > 2 ? pedacosRota[pedacosRota.length - 2] : "");
        const transDest = dados.destination?.plan_transition || (pedacosRota.length > 3 ? pedacosRota[pedacosRota.length - 3] : "");
        const appType = dados.destination?.approach_type || "ILS";

        setVal('info-callsign', callsign || "GLO1932");
        setVal('info-origin', origin);
        setVal('info-dest', dest);
        if (cruise) setVal('info-cruise', `FL${Math.round(parseInt(cruise) / 100)}`);
        setVal('info-squawk', squawk);

        setVal('input-runway', pistaOrigem);
        setVal('input-sid', sidOrigem);
        setVal('input-transition', transOrigem);

        setVal('input-star', starDest);
        setVal('input-dest-transition', transDest);
        setVal('input-dest-runway', pistaDest);

        const procTypeSelect = document.getElementById('input-proc-type');
        if (procTypeSelect && appType) {
            const upperApp = appType.toUpperCase();
            for (let option of procTypeSelect.options) {
                if (upperApp.includes(option.value)) {
                    procTypeSelect.value = option.value;
                    break;
                }
            }
        }

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
        console.error("Erro na importação:", error);
        alert('Erro ao conectar com o SimBrief.');
        if (btn) btn.textContent = originalText;
    }
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

async function updateFrequencies() {
    const originEl = document.getElementById('info-origin');
    const icao = originEl ? originEl.value.trim().toUpperCase() : "SBGR";
    const container = document.getElementById('atc-services-container');
    
    if (!container) return;

    const postos = [
        { label: "SOLO", type: ["GND", "DEL"] },
        { label: "TORRE", type: ["TWR"] },
        { label: "CONTROLE", type: ["APP"] },
        { label: "CENTRO", type: ["CTR"] }
    ];

    container.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 0.8rem; padding: 5px;">Consultando ${currentNetwork}...</div>`;

    let onlineControllers = [];
    try {
        let apiUrl = currentNetwork === "VATSIM" 
            ? 'https://data.vatsim.net/v3/vatsim-data.json'
            : 'https://api.ivao.aero/v2/tracker/whazzup';

        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            onlineControllers = currentNetwork === "VATSIM" ? (data.controllers || []) : (data.clients?.atcs || data.controllers || []);
        }
    } catch (e) {
        console.error("Erro ao buscar rede online", e);
    }

    container.innerHTML = '';

    postos.forEach(posto => {
        const encontrado = onlineControllers.find(c => {
            const callsign = c.callsign || c.id || "";
            if (!callsign.startsWith(icao)) return false;
            return posto.type.some(t => callsign.includes(t));
        });

        const isOnline = !!encontrado;
        const freqText = isOnline ? (encontrado.frequency || "122.800") : "122.800";

        const row = document.createElement('div');
        row.className = 'atc-row';
        row.innerHTML = `
            <span class="atc-label">${posto.label}</span>
            <div class="atc-status-info">
                <label class="switch">
                    <input type="checkbox" ${isOnline ? 'checked' : ''} disabled>
                    <span class="slider"></span>
                </label>
                <span class="atc-freq-display">${freqText}</span>
            </div>
        `;
        container.appendChild(row);
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
            div.classList.add('completed');
        }
        
        checkbox.addEventListener('change', (e) => {
            localStorage.setItem(e.target.id, e.target.checked);
            div.classList.toggle('completed', e.target.checked);
            updateProgress();
        });

        // Permitir clique em toda a linha do checklist
        div.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
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
        if (!el) return fallback;
        return el.value.trim() !== '' ? el.value.toUpperCase() : fallback;
    };

    const atis = getValue('input-atis', '[ATIS]');
    const gate = getValue('input-gate', '[PORTÃO]');
    const pushdir = getValue('input-pushdir', 'DIREITA');
    const rwy = getValue('input-runway', '[PISTA]');
    const sid = getValue('input-sid', '[SID]');
    const trans = getValue('input-transition', '');
    const alt = getValue('input-alt', '[ALTITUDE]');
    const taxi = getValue('input-taxi', '[TAXIWAY]');

    const star = getValue('input-star', '[STAR]');
    const destTrans = getValue('input-dest-transition', '');
    const procType = getValue('input-proc-type', 'ILS');
    const procSub = getValue('input-proc-sub', '');
    const destRwy = getValue('input-dest-runway', '[PISTA]');

    const callsign = getValue('info-callsign', '[CALLSIGN]');
    const dest = getValue('info-dest', '[DESTINO]');
    const origin = getValue('info-origin', '[ORIGEM]');
    const level = getValue('info-cruise', '[NÍVEL]');
    
    const squawkEl = document.getElementById('info-squawk');
    const squawk = squawkEl && squawkEl.value.trim() !== '' ? formatSquawk(squawkEl.value) : "____";
    
    const transicaoTexto = trans ? ` transição ${trans},` : "";
    const procCompleto = procSub ? `${procType} ${procSub}` : procType;

    let pilot = "";
    let readback = "";

    switch(currentTab) {
        case "1": 
            pilot = `Para coordenação em ${origin} o ${callsign} solicita autorização de tráfego IFR para ${dest}, com informação ${atis}, nível planejado ${level}.`;
            readback = `Autorizado IFR para ${dest}, via ${sid}${transicaoTexto} pista ${rwy}, subida inicial ${alt}, transponder ${squawk}. ${callsign}.`;
            break;
            
        case "2": 
            pilot = `Para coordenação em ${origin} o ${callsign} vai iniciar pushback e acionamento na posição ${gate} com cauda à ${pushdir}, vai reportar para o táxi.\n\n(Após o acionamento):\nPara coordenação em ${origin} o ${callsign} vai iniciar táxi via ${taxi} até o ponto de espera da pista ${rwy}.`;
            readback = `Pushback e acionamento aprovados com cauda à ${pushdir}, ${callsign}.\n\nTáxi via ${taxi} até o ponto de espera da pista ${rwy}, ${callsign}.`;
            break;
            
        case "3": 
            pilot = `Para coordenação em ${origin} o ${callsign} alinha e decola da pista ${rwy}.`;
            readback = `Livre decolagem pista ${rwy}, vento [Graus/Nós], ${callsign}.`;
            break;
            
        case "4": 
            pilot = `Para coordenação em ${origin} o ${callsign} livrou o eixo da pista ${rwy}, prossegue subida via ${sid} para o nível de voo ${level}.`;
            readback = `Subida autorizada para nível de cruzeiro ${level}, direto [Próximo Fixo], ${callsign}.`;
            break;
            
        case "5": 
            pilot = `Para coordenação em ${dest} o ${callsign} em descida para o nível de voo ${level}, via ${star}, previsto procedimento ${procCompleto} pista ${destRwy}.`;
            readback = `Ciente, autorizado procedimento pista ${destRwy}, reportará estabelecido, ${callsign}.\n\n(Pousado):\nPara coordenação em ${dest} o ${callsign} livrou a pista, vai prosseguir táxi via ${taxi} até a posição ${gate}.`;
            break;
    }

    if (textPilot) textPilot.value = pilot;
    if (textReadback) textReadback.value = readback;
}

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
            hPaInput.value = '';
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

function limparVoo() {
    if (confirm("Tem certeza que deseja apagar todos os dados e checklists do voo atual?")) {
        const simbriefInput = document.getElementById('simbrief-username');
        const savedSimbriefId = simbriefInput ? simbriefInput.value : '';

        localStorage.clear();
        
        if (savedSimbriefId) {
            localStorage.setItem('simbrief-username', savedSimbriefId);
            simbriefInput.value = savedSimbriefId;
        }
        
        const todosOsCampos = document.querySelectorAll('input[type="text"], input[type="number"], select');
        todosOsCampos.forEach(campo => {
            if (campo && campo.id !== 'simbrief-username') {
                if (campo.tagName === 'SELECT') {
                    campo.selectedIndex = 0;
                } else {
                    campo.value = '';
                }
            }
        });
        
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        updateProgress();
        updatePhraseology();
        updateFrequencies();
        
        alert("Voo limpo com sucesso! O seu ID do SimBrief foi mantido.");
    }
}