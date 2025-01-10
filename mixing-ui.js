class MixingUI {
    constructor() {
        this.calculator = new MixingCalculator();
        this.selectedBatches = [];
        this.selectedGroups = [];
        this.batches = JSON.parse(localStorage.getItem('batches')) || [];
        this.groups = JSON.parse(localStorage.getItem('batchGroups')) || [];
        this.history = JSON.parse(localStorage.getItem('mixingHistory')) || [];
        this.favorites = JSON.parse(localStorage.getItem('mixingFavorites')) || [];
        this.currentResult = null;
        this.presets = JSON.parse(localStorage.getItem('parameterPresets')) || [];
        this.showFavoritesOnly = false;
        
        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        this.renderBatchPool();
        this.renderGroups();
        this.updateSelectedCount();
        this.initializeWeightSliders();
        this.renderPresetList();
    }

    bindEvents() {
        // 计算按钮
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculateMixing();
        });

        // 清除选择按钮
        document.getElementById('clearSelectionBtn').addEventListener('click', () => {
            this.clearSelection();
        });

        // 创建分组按钮
        document.getElementById('createGroupBtn').addEventListener('click', () => {
            this.createGroup();
        });

        // 导出按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportReport();
        });

        // 保存分组按钮
        document.getElementById('saveGroupBtn').addEventListener('click', () => {
            this.saveAsGroup();
        });

        // 权重滑块事件
        document.querySelectorAll('.weight-sliders input[type="range"]').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updateWeights(e.target);
            });
        });

        // 成本分析按钮
        document.getElementById('costAnalysisBtn').addEventListener('click', () => {
            this.analyzeCost();
        });

        // 参数预设相关事件
        document.getElementById('savePresetBtn').addEventListener('click', () => {
            this.saveCurrentAsPreset();
        });
        
        document.getElementById('managePresetsBtn').addEventListener('click', () => {
            this.showPresetManager();
        });
        
        document.getElementById('resetWeightsBtn').addEventListener('click', () => {
            this.resetWeights();
        });
        
        document.getElementById('equalWeightsBtn').addEventListener('click', () => {
            this.setEqualWeights();
        });
        
        document.getElementById('clearTargetsBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.clearTargetValues();
        });

        // 历史记录按钮
        document.getElementById('historyBtn').addEventListener('click', () => {
            this.showHistory();
        });
        
        // 导入导出按钮
        document.getElementById('importExportBtn').addEventListener('click', () => {
            this.showImportExportDialog();
        });
    }

    // 渲染批次池
    renderBatchPool() {
        const pool = document.getElementById('batchPool');
        pool.innerHTML = this.batches.map(batch => this.createSelectableBatchCard(batch)).join('');

        // 添加批次选择事件
        document.querySelectorAll('.batch-card.selectable').forEach(card => {
            card.addEventListener('click', () => {
                const batchId = card.dataset.batchId;
                this.toggleBatchSelection(card, batchId);
            });
        });
    }

    // 创建可选择的批次卡片
    createSelectableBatchCard(batch) {
        const isSelected = this.selectedBatches.some(b => b.id === batch.id);
        return `
            <div class="batch-card selectable ${isSelected ? 'selected' : ''}" data-batch-id="${batch.id}">
                <div class="batch-header">
                    <h3>批次 ${batch.id}</h3>
                </div>
                <div class="batch-details">
                    <p>长度: ${batch.length} mm</p>
                    <p>细度: ${batch.fineness} dtex</p>
                    <p>重量: ${batch.weight} kg</p>
                    <p>价格: ${batch.price} 元/kg</p>
                </div>
            </div>
        `;
    }

    // 切换批次选择状态
    toggleBatchSelection(card, batchId) {
        const batch = this.batches.find(b => b.id === batchId);
        const index = this.selectedBatches.findIndex(b => b.id === batchId);

        if (index === -1) {
            this.selectedBatches.push(batch);
            card.classList.add('selected');
        } else {
            this.selectedBatches.splice(index, 1);
            card.classList.remove('selected');
        }

        this.updateSelectedCount();
    }

    // 更新选中数量显示
    updateSelectedCount() {
        const totalBatches = new Set([
            ...this.selectedBatches.map(b => b.id),
            ...this.selectedGroups.flatMap(g => g.batches)
        ]).size;
        document.getElementById('selectedCount').textContent = totalBatches;
    }

    // 清除所有选择
    clearSelection() {
        this.selectedBatches = [];
        this.selectedGroups = [];
        document.querySelectorAll('.batch-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelectorAll('.group-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
        this.updateSelectedCount();
    }

    // 初始化权重滑块
    initializeWeightSliders() {
        document.querySelectorAll('.weight-sliders input[type="range"]').forEach(slider => {
            const valueDisplay = slider.nextElementSibling;
            valueDisplay.textContent = `${slider.value}%`;
        });
    }

    // 更新权重
    updateWeights(changedSlider) {
        const sliders = document.querySelectorAll('.weight-sliders input[type="range"]');
        const total = Array.from(sliders).reduce((sum, slider) => sum + Number(slider.value), 0);

        // 更新显示值
        sliders.forEach(slider => {
            const valueDisplay = slider.nextElementSibling;
            const normalizedValue = (slider.value / total * 100).toFixed(0);
            slider.value = normalizedValue;
            valueDisplay.textContent = `${normalizedValue}%`;
        });

        // 更新计算器权重
        const weights = {
            length: Number(document.querySelector('input[name="lengthWeight"]').value) / 100,
            fineness: Number(document.querySelector('input[name="finenessWeight"]').value) / 100,
            weight: Number(document.querySelector('input[name="weightWeight"]').value) / 100,
            price: Number(document.querySelector('input[name="priceWeight"]').value) / 100
        };
        
        this.calculator.setWeights(weights);
        
        // 如果有当前结果，重新计算
        if (this.currentResult) {
            this.calculateMixing();
        }
    }

    // 获取目标值
    getTargetValues() {
        const form = document.getElementById('targetForm');
        return {
            length: parseFloat(form.targetLength.value) || 0,
            fineness: parseFloat(form.targetFineness.value) || 0,
            weight: parseFloat(form.targetWeight.value) || 0,
            price: parseFloat(form.targetPrice.value) || 0
        };
    }

    // 计算配比
    calculateMixing() {
        const allBatches = this.getAllSelectedBatches();
        if (allBatches.length < 2) {
            alert('请至少选择两个批次或分组进行配比计算');
            return;
        }

        const targetValues = this.getTargetValues();
        const result = this.calculator.findOptimalRatios(allBatches, targetValues);
        this.currentResult = result;
        
        // 保存到历史记录
        this.saveToHistory(result);
        
        // 渲染结果
        this.renderResults(result);
    }

    // 渲染结果
    renderResults(result) {
        if (!result || !result.batches) {
            console.error('Invalid result object:', result);
            return;
        }

        const container = document.querySelector('.results-container');
        container.innerHTML = `
            <div class="suggestion-card">
                <div class="suggestion-header">
                    <h3>配比方案 1</h3>
                    <div class="suggestion-score">得分: ${result.score.toFixed(2)}</div>
                </div>
                <div class="suggestion-ratios">
                    ${result.batches.map((batch, i) => `
                        <div class="batch-ratio">
                            <span>批次 ${batch.id}:</span>
                            <span class="ratio-value">${(result.ratios[i] * 100).toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
                <div class="suggestion-details">
                    <div class="suggestion-value">
                        混合长度: ${result.result.length.toFixed(2)} mm
                    </div>
                    <div class="suggestion-value">
                        混合细度: ${result.result.fineness.toFixed(2)} dtex
                    </div>
                    <div class="suggestion-value">
                        总重量: ${result.result.weight.toFixed(2)} kg
                    </div>
                    <div class="suggestion-value">
                        平均价格: ${result.result.price.toFixed(2)} 元/kg
                    </div>
                </div>
            </div>
        `;

        // 渲染饼图
        this.renderMixingChart(result);
    }

    // 获取所有选中的批次（包括分组中的批次）
    getAllSelectedBatches() {
        const selectedBatchIds = new Set(this.selectedBatches.map(b => b.id));
        
        // 添加选中分组中的批次
        this.selectedGroups.forEach(group => {
            group.batches.forEach(batchId => {
                selectedBatchIds.add(batchId);
            });
        });

        // 获取完整的批次对象
        return Array.from(selectedBatchIds).map(id => 
            this.batches.find(b => b.id === id)
        );
    }

    // 格式化配比比例显示
    formatRatios(ratios) {
        return ratios.map(r => `${(r * 100).toFixed(1)}%`).join(' : ');
    }

    // 格式化混合结果显示
    formatMixResult(result) {
        return `长度 ${result.length.toFixed(1)}mm, 细度 ${result.fineness.toFixed(1)}dtex`;
    }

    // 创建新分组
    createGroup() {
        if (this.selectedBatches.length < 2) {
            alert('请至少选择两个批次创建分组');
            return;
        }

        const groupName = prompt('请输入分组名称：');
        if (!groupName) return;

        const group = {
            id: Date.now().toString(),
            name: groupName,
            batches: this.selectedBatches.map(b => b.id)
        };

        this.groups.push(group);
        this.saveGroups();
        this.renderGroups();
    }

    // 保存当前配比为新分组
    saveAsGroup() {
        if (!this.currentResult) {
            alert('请先计算配比结果');
            return;
        }

        const groupName = prompt('请输入配比方案名称：');
        if (!groupName) return;

        const group = {
            id: Date.now().toString(),
            name: groupName,
            batches: this.selectedBatches.map(b => b.id),
            ratios: this.currentResult.ratios,
            result: this.currentResult.result
        };

        this.groups.push(group);
        this.saveGroups();
        this.renderGroups();
    }

    // 渲染分组列表
    renderGroups() {
        const container = document.getElementById('groupsContainer');
        container.innerHTML = this.groups.map(group => {
            const isSelected = this.selectedGroups.some(g => g.id === group.id);
            return `
                <div class="group-card ${isSelected ? 'selected' : ''}" data-group-id="${group.id}">
                    <div class="group-header">
                        <h3>${group.name}</h3>
                        <div class="group-actions">
                            ${group.result ? `
                                <span class="group-ratio">${this.formatRatios(group.ratios)}</span>
                            ` : ''}
                            <button class="btn-danger" onclick="event.stopPropagation(); this.deleteGroup('${group.id}')">
                                删除
                            </button>
                        </div>
                    </div>
                    <div class="group-batches">
                        ${group.batches.map(batchId => `
                            <span class="batch-tag">批次 ${batchId}</span>
                        `).join('')}
                    </div>
                    ${group.result ? `
                        <div class="group-result">
                            <p>混合结果：${this.formatMixResult(group.result)}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // 添加分组选择事件
        document.querySelectorAll('.group-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-danger')) {
                    const groupId = card.dataset.groupId;
                    this.toggleGroupSelection(card, groupId);
                }
            });
        });
    }

    // 保存分组到本地存储
    saveGroups() {
        localStorage.setItem('batchGroups', JSON.stringify(this.groups));
    }

    // 删除分组
    deleteGroup(groupId) {
        if (confirm('确定要删除这个分组吗？')) {
            this.groups = this.groups.filter(g => g.id !== groupId);
            this.saveGroups();
            this.renderGroups();
        }
    }

    // 切换分组选择状态
    toggleGroupSelection(card, groupId) {
        const group = this.groups.find(g => g.id === groupId);
        const index = this.selectedGroups.findIndex(g => g.id === groupId);

        if (index === -1) {
            this.selectedGroups.push(group);
            card.classList.add('selected');
        } else {
            this.selectedGroups.splice(index, 1);
            card.classList.remove('selected');
        }

        this.updateSelectedCount();
    }

    // 导出报告
    exportReport() {
        if (!this.currentResult) {
            alert('请先计算配比结果');
            return;
        }

        const report = this.generateReport();
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `配比报告_${new Date().toLocaleDateString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 生成报告内容
    generateReport() {
        const result = this.currentResult;
        const targetValues = this.getTargetValues();

        return `配比计算报告
生成时间: ${new Date().toLocaleString()}

选择批次:
${result.batches.map((batch, i) => `
批次 ${batch.id}:
- 长度: ${batch.length} mm
- 细度: ${batch.fineness} dtex
- 重量: ${batch.weight} kg
- 价格: ${batch.price} 元/kg
- 配比比例: ${(result.ratios[i] * 100).toFixed(1)}%
`).join('\n')}

目标参数:
- 长度: ${targetValues.length || '未设置'} mm
- 细度: ${targetValues.fineness || '未设置'} dtex
- 重量: ${targetValues.weight || '未设置'} kg
- 价格: ${targetValues.price || '未设置'} 元/kg

混合结果:
- 混合长度: ${result.result.length.toFixed(2)} mm
- 混合细度: ${result.result.fineness.toFixed(2)} dtex
- 总重量: ${result.result.weight.toFixed(2)} kg
- 平均价格: ${result.result.price.toFixed(2)} 元/kg

配比得分: ${result.score.toFixed(2)}
`;
    }

    // 渲染混合关系图表
    renderMixingChart(suggestion) {
        const chartContainer = document.getElementById('mixingChart');
        chartContainer.innerHTML = `
            <canvas id="mixingPieChart" width="300" height="300"></canvas>
            <div class="chart-legend"></div>
        `;
        
        const canvas = document.getElementById('mixingPieChart');
        const ctx = canvas.getContext('2d');
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
 
        let startAngle = 0;
        const legend = document.querySelector('.chart-legend');
        let legendHtml = '<div class="legend-title">配比比例</div>';
        
        suggestion.batches.forEach((batch, index) => {
            const ratio = suggestion.ratios[index];
            const endAngle = startAngle + (ratio * Math.PI * 2);
            const color = this.getColor(index);
            
            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.fillStyle = color;
            ctx.fill();
            
            // 添加标签
            const labelAngle = startAngle + (endAngle - startAngle) / 2;
            const labelRadius = radius * 0.7;
            const labelX = centerX + Math.cos(labelAngle) * labelRadius;
            const labelY = centerY + Math.sin(labelAngle) * labelRadius;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${(ratio * 100).toFixed(1)}%`, labelX, labelY);
            
            // 添加图例
            legendHtml += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${color}"></span>
                    <span class="legend-text">批次 ${batch.id} (${(ratio * 100).toFixed(1)}%)</span>
                </div>
            `;
            
            startAngle = endAngle;
        });
        
        legend.innerHTML = legendHtml;
    }

    // 获取颜色
    getColor(index) {
        // 预定义的颜色数组
        const colors = [
            '#FF6B6B', // 红色
            '#4ECDC4', // 青色
            '#45B7D1', // 蓝色
            '#96CEB4', // 绿色
            '#FFEEAD', // 黄色
            '#D4A5A5', // 粉色
            '#9A8194', // 紫色
            '#CEE5D0', // 浅绿
            '#FF9F1C', // 橙色
            '#2AB7CA', // 湖蓝
            '#FED766', // 金色
            '#7C77B9', // 靛蓝
            '#8CB369', // 草绿
            '#F0B67F', // 杏色
            '#D65D7A', // 玫红
            '#6C5B7B', // 深紫
            '#45B7D1', // 天蓝
            '#96CEB4', // 薄荷
            '#FFCCBC', // 珊瑚
            '#7B904B'  // 橄榄
        ];

        // 如果索引超出颜色数组范围，循环使用颜色
        return colors[index % colors.length];
    }

    // 保存配比历史
    saveToHistory(result) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            result: result,
            targetValues: this.getTargetValues(),
            weights: { ...this.calculator.weights },
            isFavorite: false,
            batches: this.selectedBatches.map(b => b.id),  // 保存选中的批次ID
            groups: this.selectedGroups.map(g => g.id)     // 保存选中的分组ID
        };
        
        this.history.unshift(historyItem);
        if (this.history.length > 50) { // 保留最近50条记录
            this.history.pop();
        }
        localStorage.setItem('mixingHistory', JSON.stringify(this.history));
    }

    // 显示历史记录
    showHistory() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content history-modal">
                <h2>配比历史记录</h2>
                <div class="history-filters">
                    <button class="btn-text ${!this.showFavoritesOnly ? 'active' : ''}" id="showAllBtn">
                        全部记录
                    </button>
                    <button class="btn-text ${this.showFavoritesOnly ? 'active' : ''}" id="showFavoritesBtn">
                        收藏记录
                    </button>
                </div>
                <div class="history-list">
                    <!-- 历史记录列表将通过 refreshHistoryView 方法渲染 -->
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="closeHistoryBtn">关闭</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定模态框按钮事件
        this.bindHistoryEvents(modal);
        
        // 渲染历史记录列表
        this.refreshHistoryView();
    }

    // 绑定历史记录操作事件
    bindHistoryEvents(modal) {
        // 过滤器按钮
        document.getElementById('showAllBtn').addEventListener('click', () => {
            this.showFavoritesOnly = false;
            document.getElementById('showAllBtn').classList.add('active');
            document.getElementById('showFavoritesBtn').classList.remove('active');
            this.refreshHistoryView();
        });
        
        document.getElementById('showFavoritesBtn').addEventListener('click', () => {
            this.showFavoritesOnly = true;
            document.getElementById('showFavoritesBtn').classList.add('active');
            document.getElementById('showAllBtn').classList.remove('active');
            this.refreshHistoryView();
        });

        // 收藏按钮
        modal.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.toggleFavorite(id);
                this.refreshHistoryView();
            });
        });

        // 应用按钮
        modal.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.applyHistory(id);
                this.closeModal();
            });
        });

        // 删除按钮
        modal.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.deleteHistory(id);
            });
        });

        // 关闭按钮
        document.getElementById('closeHistoryBtn').addEventListener('click', () => {
            this.closeModal();
        });
    }

    // 切换收藏状态
    toggleFavorite(id) {
        const item = this.history.find(h => h.id === id);
        if (item) {
            item.isFavorite = !item.isFavorite;
            localStorage.setItem('mixingHistory', JSON.stringify(this.history));
        }
    }

    // 应用历史记录
    applyHistory(id) {
        const item = this.history.find(h => h.id === id);
        if (!item) return;

        // 清除当前选择
        this.clearSelection();
        
        // 选择历史记录中的批次
        item.batches.forEach(batchId => {
            const batch = this.batches.find(b => b.id === batchId);
            if (batch) {
                this.selectedBatches.push(batch);
            }
        });
        
        // 选择历史记录中的分组
        item.groups.forEach(groupId => {
            const group = this.groups.find(g => g.id === groupId);
            if (group) {
                this.selectedGroups.push(group);
            }
        });

        // 应用权重和目标值
        this.calculator.setWeights(item.weights);
        this.updateWeightSlidersFromPreset(item.weights);
        this.setTargetValues(item.targetValues);

        // 更新UI
        this.renderBatchPool();
        this.renderGroups();
        this.updateSelectedCount();
        
        // 重新计算配比
        this.calculateMixing();
        
        // 显示成功提示
        alert('已应用历史配比方案');
    }

    // 删除历史记录
    deleteHistory(id) {
        if (!confirm('确定要删除这条历史记录吗？')) return;
        
        this.history = this.history.filter(h => h.id !== id);
        localStorage.setItem('mixingHistory', JSON.stringify(this.history));
        this.refreshHistoryView(); // 只更新列表内容，保持模态框事件
    }

    // 刷新历史记录视图
    refreshHistoryView() {
        const historyList = document.querySelector('.history-list');
        if (!historyList) return;

        // 根据过滤条件筛选记录
        const filteredHistory = this.showFavoritesOnly 
            ? this.history.filter(item => item.isFavorite)
            : this.history;

        historyList.innerHTML = filteredHistory.map(item => `
            <div class="history-item ${item.isFavorite ? 'favorite' : ''}" data-id="${item.id}">
                <div class="history-info">
                    <div class="history-header">
                        <span class="history-time">
                            ${new Date(item.timestamp).toLocaleString()}
                        </span>
                        <span class="history-score">
                            得分: ${item.result.score.toFixed(2)}
                        </span>
                    </div>
                    <div class="history-details">
                        <div class="history-batches">
                            ${item.result.batches.map((batch, i) => `
                                批次${batch.id}: ${(item.result.ratios[i] * 100).toFixed(1)}%
                            `).join(', ')}
                        </div>
                        <div class="history-result">
                            混合结果: ${item.result.result.length.toFixed(1)}mm, 
                            ${item.result.result.fineness.toFixed(1)}dtex
                        </div>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn-text favorite-btn" data-id="${item.id}">
                        ${item.isFavorite ? '取消收藏' : '收藏'}
                    </button>
                    <button class="btn-text apply-btn" data-id="${item.id}">应用</button>
                    <button class="btn-text delete-btn" data-id="${item.id}">删除</button>
                </div>
            </div>
        `).join('');

        // 重新绑定列表项的事件
        this.bindHistoryItemEvents(historyList);
    }

    // 绑定历史记录列表项事件
    bindHistoryItemEvents(container) {
        // 收藏按钮
        container.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.toggleFavorite(id);
                this.refreshHistoryView();
            });
        });

        // 应用按钮
        container.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.applyHistory(id);
                this.closeModal();
            });
        });

        // 删除按钮
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.deleteHistory(id);
            });
        });
    }

    // 显示导入导出对话框
    showImportExportDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>数据导入导出</h2>
                <div class="import-export-actions">
                    <div class="action-group">
                        <h3>导出数据</h3>
                        <button class="btn-secondary" id="exportAllBtn">导出所有数据</button>
                        <button class="btn-secondary" id="exportBatchesBtn">仅导出批次数据</button>
                        <button class="btn-secondary" id="exportHistoryBtn">仅导出历史记录</button>
                    </div>
                    <div class="action-group">
                        <h3>导入数据</h3>
                        <input type="file" id="importFileInput" accept=".json" style="display: none;">
                        <button class="btn-secondary" id="importBtn">选择文件导入</button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="closeImportExportBtn">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.bindImportExportEvents(modal);
    }

    // 分析参数相关性
    analyzeParameters() {
        const analysis = {
            correlations: this.calculateCorrelations(),
            statistics: this.calculateStatistics(),
            recommendations: this.generateRecommendations()
        };
        
        this.showAnalysisReport(analysis);
    }

    // 计算参数间的相关性
    calculateCorrelations() {
        const params = ['length', 'fineness', 'weight', 'price'];
        const correlations = {};
        
        for (let i = 0; i < params.length; i++) {
            for (let j = i + 1; j < params.length; j++) {
                const param1 = params[i];
                const param2 = params[j];
                const values1 = this.batches.map(b => b[param1]);
                const values2 = this.batches.map(b => b[param2]);
                correlations[`${param1}-${param2}`] = this.calculateCorrelation(values1, values2);
            }
        }
        
        return correlations;
    }

    // 成本分析
    analyzeCost() {
        if (!this.currentResult) {
            alert('请先计算配比结果');
            return;
        }
        
        const analysis = {
            totalCost: 0,
            costBreakdown: [],
            averageCost: 0,
            totalWeight: 0,
            potentialSavings: 0,
            recommendations: [],
            costRange: {
                min: Infinity,
                max: -Infinity
            }
        };
        
        // 计算总成本和成本明细
        this.currentResult.batches.forEach((batch, i) => {
            const ratio = this.currentResult.ratios[i];
            const weight = batch.weight * ratio;
            const cost = batch.price * weight;
            analysis.totalCost += cost;
            analysis.totalWeight += weight;
            analysis.costRange.min = Math.min(analysis.costRange.min, batch.price);
            analysis.costRange.max = Math.max(analysis.costRange.max, batch.price);
            
            analysis.costBreakdown.push({
                batchId: batch.id,
                ratio: ratio,
                weight: weight,
                cost: cost,
                percentage: cost / analysis.totalCost * 100,
                unitPrice: batch.price
            });
        });
        
        // 计算平均成本
        analysis.averageCost = analysis.totalCost / analysis.totalWeight;
        
        // 生成成本优化建议
        this.generateCostRecommendations(analysis);
        
        this.showCostAnalysisReport(analysis);
    }

    // 生成成本优化建议
    generateCostRecommendations(analysis) {
        const recommendations = [];
        
        // 检查高成本批次
        analysis.costBreakdown.forEach(item => {
            if (item.unitPrice > analysis.averageCost * 1.2) { // 高于平均成本20%
                recommendations.push({
                    type: 'high_cost',
                    message: `批次 ${item.batchId} 的单价 (${item.unitPrice.toFixed(2)}元/kg) 显著高于平均水平，建议减少使用比例或寻找替代批次。`
                });
            }
        });
        
        // 检查成本优化空间
        const costDiff = analysis.costRange.max - analysis.costRange.min;
        if (costDiff > analysis.averageCost * 0.3) { // 价格差异超过30%
            recommendations.push({
                type: 'cost_gap',
                message: `批次间价格差异较大 (${costDiff.toFixed(2)}元/kg)，建议优化配比以降低总成本。`
            });
        }
        
        // 计算潜在节省空间
        const potentialCost = analysis.totalWeight * analysis.costRange.min;
        analysis.potentialSavings = analysis.totalCost - potentialCost;
        
        if (analysis.potentialSavings > analysis.totalCost * 0.1) { // 可节省10%以上
            recommendations.push({
                type: 'savings',
                message: `通过优化配比，理论上可节省成本约 ${analysis.potentialSavings.toFixed(2)}元。`
            });
        }
        
        analysis.recommendations = recommendations;
    }

    // 显示成本分析报告
    showCostAnalysisReport(analysis) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content cost-analysis">
                <h2>成本分析报告</h2>
                
                <div class="cost-summary">
                    <div class="summary-item">
                        <h3>总成本</h3>
                        <p>${analysis.totalCost.toFixed(2)}元</p>
                    </div>
                    <div class="summary-item">
                        <h3>平均单价</h3>
                        <p>${analysis.averageCost.toFixed(2)}元/kg</p>
                    </div>
                    <div class="summary-item">
                        <h3>总重量</h3>
                        <p>${analysis.totalWeight.toFixed(2)}kg</p>
                    </div>
                </div>
                
                <div class="cost-breakdown">
                    <h3>成本明细</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>批次</th>
                                <th>配比比例</th>
                                <th>重量(kg)</th>
                                <th>单价(元/kg)</th>
                                <th>成本(元)</th>
                                <th>占比</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${analysis.costBreakdown.map(item => `
                                <tr>
                                    <td>批次 ${item.batchId}</td>
                                    <td>${(item.ratio * 100).toFixed(1)}%</td>
                                    <td>${item.weight.toFixed(2)}</td>
                                    <td>${item.unitPrice.toFixed(2)}</td>
                                    <td>${item.cost.toFixed(2)}</td>
                                    <td>${item.percentage.toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="cost-recommendations">
                    <h3>优化建议</h3>
                    ${analysis.recommendations.length > 0 ? `
                        <ul>
                            ${analysis.recommendations.map(rec => `
                                <li class="recommendation ${rec.type}">${rec.message}</li>
                            `).join('')}
                        </ul>
                    ` : '<p>暂无优化建议。</p>'}
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary" id="exportCostReportBtn">
                        导出报告
                    </button>
                    <button class="btn-primary" id="closeCostModalBtn">关闭</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定按钮事件
        document.getElementById('exportCostReportBtn').addEventListener('click', () => {
            this.exportCostReport(analysis);
        });
        
        document.getElementById('closeCostModalBtn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // 渲染成本分布图表
        this.renderCostChart(analysis);
    }

    // 导出成本分析报告
    exportCostReport(analysis) {
        const report = `成本分析报告
生成时间: ${new Date().toLocaleString()}

总体情况：
- 总成本: ${analysis.totalCost.toFixed(2)}元
- 平均单价: ${analysis.averageCost.toFixed(2)}元/kg
- 总重量: ${analysis.totalWeight.toFixed(2)}kg

成本明细:
${analysis.costBreakdown.map(item => `
批次 ${item.batchId}:
- 配比比例: ${(item.ratio * 100).toFixed(1)}%
- 重量: ${item.weight.toFixed(2)}kg
- 单价: ${item.unitPrice.toFixed(2)}元/kg
- 成本: ${item.cost.toFixed(2)}元
- 成本占比: ${item.percentage.toFixed(1)}%
`).join('\n')}

优化建议:
${analysis.recommendations.map(rec => `- ${rec.message}`).join('\n')}

潜在节省:
- 最低单价: ${analysis.costRange.min.toFixed(2)}元/kg
- 最高单价: ${analysis.costRange.max.toFixed(2)}元/kg
- 理论节省空间: ${analysis.potentialSavings.toFixed(2)}元
`;

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `成本分析报告_${new Date().toLocaleDateString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 渲染成本分布图表
    renderCostChart(analysis) {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'cost-chart';
        chartContainer.innerHTML = '<canvas id="costPieChart" width="300" height="300"></canvas>';
        
        document.querySelector('.cost-analysis').insertBefore(
            chartContainer,
            document.querySelector('.cost-recommendations')
        );
        
        const canvas = document.getElementById('costPieChart');
        const ctx = canvas.getContext('2d');
        
        // 绘制饼图
        let startAngle = 0;
        analysis.costBreakdown.forEach((item, index) => {
            const endAngle = startAngle + (item.percentage / 100 * Math.PI * 2);
            const color = this.getColor(index);
            
            ctx.beginPath();
            ctx.moveTo(150, 150);
            ctx.arc(150, 150, 100, startAngle, endAngle);
            ctx.fillStyle = color;
            ctx.fill();
            
            startAngle = endAngle;
        });
    }

    // 导出数据（根据类型导出不同内容）
    exportData(type) {
        let data = {};
        let filename = '';
        
        switch (type) {
            case 'all':
                data = {
                    batches: this.batches,
                    groups: this.groups,
                    history: this.history,
                    presets: this.presets,
                    version: '1.0'
                };
                filename = `全部数据_${new Date().toLocaleDateString()}.json`;
                break;
                
            case 'batches':
                data = {
                    batches: this.batches,
                    groups: this.groups,
                    version: '1.0'
                };
                filename = `批次数据_${new Date().toLocaleDateString()}.json`;
                break;
                
            case 'history':
                data = {
                    history: this.history,
                    version: '1.0'
                };
                filename = `历史记录_${new Date().toLocaleDateString()}.json`;
                break;
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 导入数据
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.version === '1.0') {
                    // 根据数据内容更新相应的数据
                    if (data.batches) this.batches = data.batches;
                    if (data.groups) this.groups = data.groups;
                    if (data.history) this.history = data.history;
                    if (data.presets) this.presets = data.presets;
                    
                    this.saveAllData();
                    this.initializeUI();
                    alert('数据导入成功');
                    this.closeModal();
                } else {
                    alert('不支持的数据版本');
                }
            } catch (error) {
                alert('数据格式错误：' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // 保存所有数据到本地存储
    saveAllData() {
        localStorage.setItem('batches', JSON.stringify(this.batches));
        localStorage.setItem('batchGroups', JSON.stringify(this.groups));
        localStorage.setItem('mixingHistory', JSON.stringify(this.history));
        localStorage.setItem('parameterPresets', JSON.stringify(this.presets));
    }

    // 关闭模态框
    closeModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    }

    // 保存当前参数设置为预设
    saveCurrentAsPreset() {
        const name = prompt('请输入预设名称：');
        if (!name) return;

        // 获取当前权重和目标值
        const currentWeights = {
            length: parseFloat(document.querySelector('input[name="lengthWeight"]').value) / 100,
            fineness: parseFloat(document.querySelector('input[name="finenessWeight"]').value) / 100,
            weight: parseFloat(document.querySelector('input[name="weightWeight"]').value) / 100,
            price: parseFloat(document.querySelector('input[name="priceWeight"]').value) / 100
        };

        const preset = {
            id: Date.now(),
            name: name,
            weights: currentWeights,
            targetValues: this.getTargetValues(),
            timestamp: new Date().toISOString()
        };

        this.presets.unshift(preset);
        localStorage.setItem('parameterPresets', JSON.stringify(this.presets));
        this.renderPresetList();
        
        // 显示保存成功提示
        alert('预设保存成功！');
    }

    // 渲染预设列表
    renderPresetList() {
        const list = document.getElementById('presetList');
        if (!list) return;
        
        list.innerHTML = this.presets.map(preset => `
            <div class="preset-item" data-preset-id="${preset.id}">
                <div class="preset-info">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-date">
                        ${new Date(preset.timestamp).toLocaleDateString()}
                    </div>
                </div>
                <div class="preset-actions">
                    <button class="btn-text preset-apply" data-preset-id="${preset.id}" onclick="event.stopPropagation();">
                        应用
                    </button>
                    <button class="btn-text preset-delete" data-preset-id="${preset.id}" onclick="event.stopPropagation();">
                        删除
                    </button>
                </div>
            </div>
        `).join('');
        
        // 绑定预设操作事件
        list.querySelectorAll('.preset-apply').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.presetId);
            });
        });
        
        list.querySelectorAll('.preset-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deletePreset(btn.dataset.presetId);
            });
        });
    }

    // 应用预设
    applyPreset(presetId) {
        const preset = this.presets.find(p => p.id === parseInt(presetId));
        if (!preset) return;

        // 应用权重
        this.calculator.setWeights(preset.weights);
        this.updateWeightSlidersFromPreset(preset.weights);

        // 应用目标值
        this.setTargetValues(preset.targetValues);

        // 如果有当前结果，重新计算
        if (this.currentResult) {
            this.calculateMixing();
        }
        
        // 显示应用成功提示
        alert('预设应用成功！');
    }

    // 更新权重滑块值
    updateWeightSlidersFromPreset(weights) {
        // 更新滑块值
        const sliders = {
            lengthWeight: document.querySelector('input[name="lengthWeight"]'),
            finenessWeight: document.querySelector('input[name="finenessWeight"]'),
            weightWeight: document.querySelector('input[name="weightWeight"]'),
            priceWeight: document.querySelector('input[name="priceWeight"]')
        };

        // 设置滑块值
        sliders.lengthWeight.value = Math.round(weights.length * 100);
        sliders.finenessWeight.value = Math.round(weights.fineness * 100);
        sliders.weightWeight.value = Math.round(weights.weight * 100);
        sliders.priceWeight.value = Math.round(weights.price * 100);
        
        // 更新显示值
        Object.values(sliders).forEach(slider => {
            const valueDisplay = slider.nextElementSibling;
            valueDisplay.textContent = `${slider.value}%`;
        });

        // 更新计算器权重
        this.calculator.setWeights({
            length: sliders.lengthWeight.value / 100,
            fineness: sliders.finenessWeight.value / 100,
            weight: sliders.weightWeight.value / 100,
            price: sliders.priceWeight.value / 100
        });
    }

    // 设置目标值
    setTargetValues(values) {
        const form = document.getElementById('targetForm');
        
        // 检查并设置每个目标值
        if (values.length !== undefined && values.length !== null) {
            form.querySelector('input[name="targetLength"]').value = values.length;
        }
        if (values.fineness !== undefined && values.fineness !== null) {
            form.querySelector('input[name="targetFineness"]').value = values.fineness;
        }
        if (values.weight !== undefined && values.weight !== null) {
            form.querySelector('input[name="targetWeight"]').value = values.weight;
        }
        if (values.price !== undefined && values.price !== null) {
            form.querySelector('input[name="targetPrice"]').value = values.price;
        }
    }

    // 清除目标值
    clearTargetValues() {
        const form = document.getElementById('targetForm');
        form.reset();
    }

    // 重置权重
    resetWeights() {
        const defaultWeights = {
            length: 25,
            fineness: 25,
            weight: 25,
            price: 25
        };
        this.updateWeightSlidersFromPreset({
            length: 0.25,
            fineness: 0.25,
            weight: 0.25,
            price: 0.25
        });
        this.calculator.setWeights(defaultWeights);
    }

    // 设置均匀权重
    setEqualWeights() {
        this.resetWeights();
    }

    // 显示预设管理器
    showPresetManager() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>管理参数预设</h2>
                <div class="preset-manager">
                    ${this.presets.map(preset => `
                        <div class="preset-item">
                            <div class="preset-info">
                                <div class="preset-name">${preset.name}</div>
                                <div class="preset-date">
                                    ${new Date(preset.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                            <div class="preset-actions">
                                <button class="btn-text preset-apply" data-preset-id="${preset.id}" onclick="event.stopPropagation();">
                                    应用
                                </button>
                                <button class="btn-text preset-delete" data-preset-id="${preset.id}" onclick="event.stopPropagation();">
                                    删除
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="closePresetManagerBtn">关闭</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定预设管理器中的按钮事件
        const manager = document.querySelector('.preset-manager');
        manager.querySelectorAll('.preset-apply').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.presetId);
                this.closeModal();  // 应用后关闭管理器
            });
        });
        
        manager.querySelectorAll('.preset-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deletePreset(btn.dataset.presetId);
            });
        });
        
        document.getElementById('closePresetManagerBtn').addEventListener('click', () => {
            this.closeModal();
        });
    }

    // 删除预设
    deletePreset(presetId) {
        const preset = this.presets.find(p => p.id === parseInt(presetId));
        if (!preset) return;
        
        if (!confirm(`确定要删除预设"${preset.name}"吗？`)) return;
        
        this.presets = this.presets.filter(p => p.id !== parseInt(presetId));
        localStorage.setItem('parameterPresets', JSON.stringify(this.presets));
        this.renderPresetList();
        
        // 如果在管理器中，刷新管理器视图
        const manager = document.querySelector('.preset-manager');
        if (manager) {
            this.showPresetManager();
        }
    }

    // 绑定导入导出对话框事件
    bindImportExportEvents(modal) {
        // 导出按钮
        document.getElementById('exportAllBtn').addEventListener('click', () => {
            this.exportData('all');
        });
        
        document.getElementById('exportBatchesBtn').addEventListener('click', () => {
            this.exportData('batches');
        });
        
        document.getElementById('exportHistoryBtn').addEventListener('click', () => {
            this.exportData('history');
        });
        
        // 导入按钮
        const importFileInput = document.getElementById('importFileInput');
        document.getElementById('importBtn').addEventListener('click', () => {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importData(e.target.files[0]);
            }
        });
        
        // 关闭按钮
        document.getElementById('closeImportExportBtn').addEventListener('click', () => {
            this.closeModal();
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new MixingUI();
}); 