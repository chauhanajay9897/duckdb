let posCount = 0;
    const strategyFileName = 'strategy.json';
    const toggleStates = {seg:'Options', opt:'Call', action:'Buy'};
    const positionsList = document.getElementById('positions-list');
    const statusEl = document.getElementById('status');

    function updateStatus(msg){ statusEl.textContent = msg; }

    function activateButton(btn, group){
      const parent = btn.parentElement;
      parent.querySelectorAll('button').forEach(b => b.className = '');
      if(group === 'action') btn.className = btn.dataset.value === 'Buy' ? 'active-buy' : 'active-sell';
      else if(group === 'seg') btn.className = 'active-seg';
      else if(group === 'opt') btn.className = 'active-opt';
      toggleStates[group] = btn.dataset.value;
      if(group === 'seg'){
        document.getElementById('opttype-group').style.opacity = toggleStates.seg === 'Options' ? '1' : '0.55';
      }
      updateStatus('Selected: ' + toggleStates.seg + ' / ' + toggleStates.opt + ' / ' + toggleStates.action);
    }

    function initializeToggleGroups(){
      document.querySelectorAll('.toggle-group').forEach(group => {
        const key = group.dataset.group;
        let active = group.querySelector('button.active-buy, button.active-sell, button.active-seg, button.active-opt');
        if(!active){
          const defaultValue = group.dataset.default;
          active = defaultValue ? Array.from(group.querySelectorAll('button')).find(btn => btn.dataset.value === defaultValue) : null;
        }
        if(!active) active = group.querySelector('button');
        if(active) activateButton(active, key);
      });
    }

    document.querySelectorAll('.toggle-group').forEach(group => {
      const key = group.dataset.group;
      group.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => activateButton(btn, key)));
    });

    initializeToggleGroups();

    function rowHtml(id, lots, side, strike, type, expiry, indexName, segment, enabled = true){
      const badgeClass = side === 'SELL' ? 'pos-badge-sell' : 'pos-badge-buy';
      const color = type === 'PUT' ? '#e05a5a' : '#0aa8c7';
      return `<div class="pos-row${enabled ? '' : ' disabled'}" id="pos-${id}">
        <label class="toggle-sm" style="margin-right:8px;font-size:12px">
          <input type="checkbox" class="pos-enable" data-id="${id}" ${enabled ? 'checked' : ''}>
          Leg-${id + 1}
        </label>
        <input type="number" value="${lots}" min="1" style="width:50px">
        <button type="button" class="pos-toggle ${side==='BUY' ? 'toggle-buy' : 'toggle-sell'}" data-id="${id}" data-role="side">${side}</button>
        <button type="button" class="pos-toggle ${type==='CALL' ? 'toggle-call' : type==='PUT' ? 'toggle-put' : 'toggle-futures'}" data-id="${id}" data-role="type">${type}</button>
        <select><option ${strike==='ATM'?'selected':''}>ATM</option><option ${strike==='ATM+1'?'selected':''}>ATM+1</option><option ${strike==='ATM-1'?'selected':''}>ATM-1</option><option ${strike==='ITM1'?'selected':''}>ITM1</option><option ${strike==='OTM1'?'selected':''}>OTM1</option></select>
        <span style="font-size:12px;color:var(--color-text-secondary)">${indexName}</span>
        <div class="pos-actions">
          <button class="pos-link">+ Target Profit</button>
          <button class="pos-link">+ Stop Loss</button>
          <button class="pos-link">+ Trail Stop Loss</button>
          <button class="pos-link">+ Journey</button>
          <select class="expiry-sel"><option ${expiry==='Weekly'?'selected':''}>Weekly</option><option ${expiry==='Monthly'?'selected':''}>Monthly</option><option ${expiry==='Next Weekly'?'selected':''}>Next Weekly</option><option ${expiry==='Next Monthly'?'selected':''}>Next Monthly</option></select>
          <button class="delete-btn" data-id="${id}" aria-label="Remove position">🗑</button>
        </div>
      </div>`;
    }

    function addPosition(){
      const lots = document.getElementById('lots').value || 1;
      const strike = document.getElementById('strike').value;
      const expiry = document.getElementById('expiry').value;
      const indexName = document.getElementById('index').value;
      const segment = toggleStates.seg;
      const side = toggleStates.action.toUpperCase();
      const type = segment === 'Futures' ? 'FUTURES' : toggleStates.opt.toUpperCase();
      const id = posCount++;
      positionsList.insertAdjacentHTML('beforeend', rowHtml(id, lots, side, strike, type, expiry, indexName, segment));
      bindRowControls();
      updateStatus('Position added: ' + side + ' ' + type + ' ' + strike + ' (' + expiry + ')');
    }

    function removePos(id){
      const el = document.getElementById('pos-' + id);
      if(el) el.remove();
      updateStatus('Position removed.');
    }

    function bindRowControls(){
      positionsList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => removePos(btn.dataset.id);
      });
      positionsList.querySelectorAll('.pos-enable').forEach(chk => {
        chk.onchange = () => toggleRowEnabled(chk.dataset.id, chk.checked);
      });
      positionsList.querySelectorAll('.pos-toggle').forEach(btn => {
        btn.onclick = () => togglePosButton(btn);
      });
    }

    function getRowData(row){
      return {
        enabled: row.classList.contains('disabled') ? false : true,
        lots: Number(row.querySelector('input[type="number"]').value) || 1,
        side: row.querySelector('[data-role="side"]').textContent.trim(),
        type: row.querySelector('[data-role="type"]').textContent.trim(),
        strike: row.querySelector('select:not(.expiry-sel)').value,
        expiry: row.querySelector('.expiry-sel').value,
        index: row.querySelector('span').textContent.trim()
      };
    }

    function getCurrentStrategyData(){
      const strategyName = document.getElementById('strategy-name').value.trim();
      return {
        strategy_name: strategyName,
        status: true,
        params: {
          savedAt: new Date().toISOString(),
          segment: toggleStates.seg,
          optionType: toggleStates.opt,
          actionType: toggleStates.action,
          strike: document.getElementById('strike').value,
          expiry: document.getElementById('expiry').value,
          index: document.getElementById('index').value,
          lots: Number(document.getElementById('lots').value) || 1,
          positions: Array.from(positionsList.querySelectorAll('.pos-row')).map(getRowData)
        }
      };
    }

    function getSavedStrategyList(){
      const list = localStorage.getItem('strategy_list');
      return list ? JSON.parse(list) : [];
    }

    function setSavedStrategyList(names){
      localStorage.setItem('strategy_list', JSON.stringify(names));
    }

    function saveStrategy(){
      const data = getCurrentStrategyData();
      if(!data.strategy_name) return updateStatus('Enter a strategy name before saving.');
      localStorage.setItem('strategy:' + data.strategy_name, JSON.stringify(data));
      const savedNames = getSavedStrategyList();
      if(!savedNames.includes(data.strategy_name)){
        savedNames.push(data.strategy_name);
        setSavedStrategyList(savedNames);
      }
      updateStatus('Strategy "' + data.strategy_name + '" saved locally.');
    }

    function downloadJson(data, filename){
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function exportStrategy(){
      const data = getCurrentStrategyData();
      if(!data.strategy_name) return updateStatus('Enter a strategy name before exporting.');
      downloadJson(data, strategyFileName);
      updateStatus('Strategy exported as "' + strategyFileName + '". Save it from your browser downloads.');
    }

    function importStrategy(){
      document.getElementById('strategy-file').click();
    }

    function loadStrategy(data){
      if(!data || typeof data !== 'object' || !Array.isArray(data.params?.positions)) return updateStatus('Invalid strategy file.');
      document.getElementById('strategy-name').value = data.strategy_name || '';
      positionsList.innerHTML = '';
      posCount = 0;
      data.params.positions.forEach(pos => {
        const id = posCount++;
        positionsList.insertAdjacentHTML('beforeend', rowHtml(
          id,
          pos.lots || 1,
          pos.side || 'BUY',
          pos.strike || 'ATM',
          pos.type || 'CALL',
          pos.expiry || 'Weekly',
          pos.index || 'Nifty',
          'Options',
          pos.enabled !== false
        ));
      });
      bindRowControls();
      updateStatus('Strategy "' + (data.strategy_name || 'Imported') + '" loaded.');
    }

    function handleStrategyFile(event){
      const file = event.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          loadStrategy(data);
        } catch (err) {
          updateStatus('Failed to import strategy: invalid JSON.');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    function loadStrategyFromFile(){
      fetch(strategyFileName, {cache: 'no-cache'})
        .then(response => {
          if(!response.ok) throw new Error('No strategy.json found');
          return response.json();
        })
        .then(loadStrategy)
        .catch(() => {
          updateStatus('strategy.json not loaded. Using default layout.');
        });
    }

    function togglePosButton(button){
      const row = document.getElementById('pos-' + button.dataset.id);
      if(!row) return;
      const role = button.dataset.role;
      if(role === 'side'){
        const next = button.textContent.trim() === 'BUY' ? 'SELL' : 'BUY';
        button.textContent = next;
        button.classList.toggle('toggle-buy', next === 'BUY');
        button.classList.toggle('toggle-sell', next === 'SELL');
      } else if(role === 'type'){
        const current = button.textContent.trim();
        const next = current === 'CALL' ? 'PUT' : current === 'PUT' ? 'CALL' : 'PUT';
        button.textContent = next;
        button.classList.toggle('toggle-call', next === 'CALL');
        button.classList.toggle('toggle-put', next === 'PUT');
      }
    }

    function toggleRowEnabled(id, enabled){
      const row = document.getElementById('pos-' + id);
      if(!row) return;
      row.classList.toggle('disabled', !enabled);
      updateStatus('Position ' + (enabled ? 'enabled' : 'disabled') + '.');
    }

    document.getElementById('addBtn').addEventListener('click', addPosition);
    document.getElementById('saveStrategyBtn').addEventListener('click', saveStrategy);
    document.getElementById('exportStrategyBtn').addEventListener('click', exportStrategy);
    document.getElementById('importStrategyBtn').addEventListener('click', importStrategy);
    document.getElementById('strategy-file').addEventListener('change', handleStrategyFile);
    document.getElementById('themeBtn').addEventListener('click', () => {
      const root = document.documentElement;
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    });

    loadStrategyFromFile();
    positionsList.innerHTML = rowHtml(posCount++, 1, toggleStates.action.toUpperCase(), 'ATM', 'CALL', 'Weekly', 'Nifty', 'Options');
    bindRowControls();
    updateStatus('Default sample position loaded.');