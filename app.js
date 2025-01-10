// 批次数据管理
class BatchManager {
    constructor() {
        this.batches = JSON.parse(localStorage.getItem('batches')) || [];
        this.editingBatch = null;
        this.initializeEventListeners();
        this.renderBatches();
    }

    // 初始化事件监听
    initializeEventListeners() {
        // 添加批次按钮
        document.getElementById('addBatchBtn').addEventListener('click', () => {
            this.editingBatch = null;
            document.getElementById('modalTitle').textContent = '添加新批次';
            document.getElementById('deleteBatchBtn').style.display = 'none';
            document.getElementById('batchForm').reset();
            document.getElementById('addBatchModal').style.display = 'block';
        });

        // 前往配比计算页面
        document.getElementById('mixingBtn').addEventListener('click', () => {
            window.location.href = 'mixing.html';
        });

        // 搜索功能
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterBatches(e.target.value);
        });

        // 表单提交
        document.getElementById('batchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = this.getFormData();
            if (this.editingBatch) {
                this.updateBatch(data);
            } else {
                this.addBatch(data);
            }
            this.closeModal();
        });

        // 删除按钮
        document.getElementById('deleteBatchBtn').addEventListener('click', () => {
            if (confirm('确定要删除这个批次吗？')) {
                this.deleteBatch(this.editingBatch.id);
                this.closeModal();
            }
        });
    }

    // 获取表单数据
    getFormData() {
        const form = document.getElementById('batchForm');
        return {
            id: form.batchId.value,
            length: parseFloat(form.length.value),
            fineness: parseFloat(form.fineness.value),
            weight: parseFloat(form.weight.value),
            price: parseFloat(form.price.value),
            timestamp: Date.now()
        };
    }

    // 填充表单数据
    fillForm(batch) {
        const form = document.getElementById('batchForm');
        form.batchId.value = batch.id;
        form.length.value = batch.length;
        form.fineness.value = batch.fineness;
        form.weight.value = batch.weight;
        form.price.value = batch.price;
    }

    // 添加新批次
    addBatch(batchData) {
        if (this.batches.some(b => b.id === batchData.id)) {
            alert('批次编号已存在！');
            return;
        }
        this.batches.push(batchData);
        this.saveBatches();
        this.renderBatches();
        this.showToast('批次添加成功');
    }

    // 更新批次
    updateBatch(batchData) {
        const index = this.batches.findIndex(b => b.id === this.editingBatch.id);
        if (index !== -1) {
            this.batches[index] = { ...batchData };
            this.saveBatches();
            this.renderBatches();
            this.showToast('批次更新成功');
        }
    }

    // 删除批次
    deleteBatch(batchId) {
        this.batches = this.batches.filter(b => b.id !== batchId);
        this.saveBatches();
        this.renderBatches();
        this.showToast('批次已删除');
    }

    // 搜索批次
    filterBatches(keyword) {
        const filteredBatches = this.batches.filter(batch => 
            batch.id.toLowerCase().includes(keyword.toLowerCase())
        );
        this.renderBatches(filteredBatches);
    }

    // 保存到本地存储
    saveBatches() {
        localStorage.setItem('batches', JSON.stringify(this.batches));
    }

    // 渲染批次列表
    renderBatches(batchesToRender = this.batches) {
        const grid = document.querySelector('.batch-grid');
        grid.innerHTML = batchesToRender.map(batch => this.createBatchCard(batch)).join('');

        // 添加点击事件
        document.querySelectorAll('.batch-card').forEach(card => {
            card.addEventListener('click', () => {
                const batchId = card.dataset.batchId;
                this.editBatch(batchId);
            });
        });
    }

    // 创建批次卡片
    createBatchCard(batch) {
        return `
            <div class="batch-card" data-batch-id="${batch.id}">
                <div class="batch-header">
                    <h3>批次 ${batch.id}</h3>
                    <span class="batch-timestamp">${new Date(batch.timestamp).toLocaleDateString()}</span>
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

    // 编辑批次
    editBatch(batchId) {
        this.editingBatch = this.batches.find(b => b.id === batchId);
        if (this.editingBatch) {
            document.getElementById('modalTitle').textContent = '编辑批次';
            document.getElementById('deleteBatchBtn').style.display = 'block';
            this.fillForm(this.editingBatch);
            document.getElementById('addBatchModal').style.display = 'block';
        }
    }

    // 显示提示消息
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// 关闭模态框
function closeModal() {
    document.getElementById('addBatchModal').style.display = 'none';
    document.getElementById('batchForm').reset();
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new BatchManager();
}); 