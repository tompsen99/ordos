// 配比计算核心类
class MixingCalculator {
    constructor() {
        this.weights = {
            length: 0.25,    // 长度权重
            fineness: 0.25,  // 细度权重
            weight: 0.25,    // 重量权重
            price: 0.25      // 价格权重
        };
        this.maxIterations = 1000; // 最大迭代次数
        this.convergenceThreshold = 0.0001; // 收敛阈值
    }

    // 计算多个批次的混合结果
    calculateMix(batches, ratios) {
        const result = {
            length: 0,
            fineness: 0,
            weight: 0,
            price: 0
        };

        // 确保比例之和为1
        const totalRatio = ratios.reduce((a, b) => a + b, 0);
        const normalizedRatios = ratios.map(r => r / totalRatio);

        // 计算加权平均值
        for (let i = 0; i < batches.length; i++) {
            result.length += batches[i].length * normalizedRatios[i];
            result.fineness += batches[i].fineness * normalizedRatios[i];
            result.weight += batches[i].weight * normalizedRatios[i];
            result.price += batches[i].price * normalizedRatios[i];
        }

        return result;
    }

    // 使用梯度下降法优化多批次配比
    findOptimalRatios(batches, targetValues) {
        const n = batches.length;
        
        // 生成多个随机初始点
        let bestRatios = null;
        let bestScore = Number.MAX_VALUE;
        
        // 尝试多个不同的初始点
        for (let attempt = 0; attempt < 10; attempt++) {
            let ratios = this.generateRandomRatios(n);
            let currentScore = this.calculateScore(this.calculateMix(batches, ratios), targetValues);
            let improved = true;
            let iterationsWithoutImprovement = 0;
            
            // 梯度下降迭代
            for (let iter = 0; iter < this.maxIterations && improved && iterationsWithoutImprovement < 50; iter++) {
                improved = false;
                
                // 计算每个比例的梯度
                for (let i = 0; i < n; i++) {
                    const deltas = [-0.1, -0.05, -0.01, 0.01, 0.05, 0.1];
                    let bestLocalRatio = ratios[i];
                    let bestLocalScore = currentScore;
                    
                    // 尝试不同的步长
                    for (const delta of deltas) {
                        const newRatio = Math.max(0, Math.min(1, ratios[i] + delta));
                        const tempRatios = [...ratios];
                        tempRatios[i] = newRatio;
                        
                        // 归一化其他比例
                        const sum = tempRatios.reduce((a, b) => a + b, 0);
                        const normalizedRatios = tempRatios.map(r => r / sum);
                        
                        const score = this.calculateScore(
                            this.calculateMix(batches, normalizedRatios),
                            targetValues
                        );
                        
                        if (score < bestLocalScore) {
                            bestLocalScore = score;
                            bestLocalRatio = newRatio;
                            improved = true;
                        }
                    }
                    
                    ratios[i] = bestLocalRatio;
                }
                
                // 归一化比例
                const sum = ratios.reduce((a, b) => a + b, 0);
                ratios = ratios.map(r => r / sum);
                
                currentScore = this.calculateScore(this.calculateMix(batches, ratios), targetValues);
                
                if (!improved) {
                    iterationsWithoutImprovement++;
                } else {
                    iterationsWithoutImprovement = 0;
                }
            }
            
            // 更新全局最优解
            if (currentScore < bestScore) {
                bestScore = currentScore;
                bestRatios = [...ratios];
            }
        }

        return {
            ratios: bestRatios,
            score: bestScore,
            batches: batches,
            result: this.calculateMix(batches, bestRatios)
        };
    }

    // 生成多个配比建议
    generateMixingSuggestions(batches, targetValues, maxSuggestions = 5) {
        const suggestions = [];
        const n = batches.length;

        // 生成多个不同的初始比例
        for (let i = 0; i < maxSuggestions * 2; i++) {
            const initialRatios = this.generateRandomRatios(n);
            const result = this.findOptimalRatios(batches, targetValues);
            
            // 检查是否是新的独特解
            if (!this.isDuplicateSolution(suggestions, result)) {
                suggestions.push({
                    batches: batches,
                    ratios: result.ratios,
                    score: result.score,
                    result: result.result
                });
            }
        }

        // 按分数排序并返回最佳建议
        return suggestions
            .sort((a, b) => a.score - b.score)
            .slice(0, maxSuggestions);
    }

    // 生成随机初始比例
    generateRandomRatios(n) {
        const ratios = new Array(n).fill(0).map(() => Math.random());
        const total = ratios.reduce((a, b) => a + b, 0);
        return ratios.map(r => r / total);
    }

    // 检查是否是重复解
    isDuplicateSolution(suggestions, newSolution, threshold = 0.05) {
        return suggestions.some(s => {
            const ratiosDiff = s.ratios.map((r, i) => 
                Math.abs(r - newSolution.ratios[i])
            ).reduce((a, b) => a + b, 0);
            return ratiosDiff < threshold;
        });
    }

    // 计算与目标值的差异分数
    calculateScore(values, targetValues) {
        let score = 0;
        let weightSum = 0;
        
        if (targetValues.length) {
            score += Math.abs(values.length - targetValues.length) * this.weights.length;
            weightSum += this.weights.length;
        }
        if (targetValues.fineness) {
            score += Math.abs(values.fineness - targetValues.fineness) * this.weights.fineness;
            weightSum += this.weights.fineness;
        }
        if (targetValues.weight) {
            score += Math.abs(values.weight - targetValues.weight) * this.weights.weight;
            weightSum += this.weights.weight;
        }
        if (targetValues.price) {
            score += Math.abs(values.price - targetValues.price) * this.weights.price;
            weightSum += this.weights.price;
        }

        // 归一化得分
        if (weightSum > 0) {
            score /= weightSum;
        }

        return score;
    }

    // 设置参数权重
    setWeights(weights) {
        this.weights = { ...this.weights, ...weights };
        // 确保权重总和为1
        const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
        for (let key in this.weights) {
            this.weights[key] /= sum;
        }
    }
} 