/**
 * structureAnalyzer.js
 * محلل البنية والتنظيم
 * يقيم جودة تنظيم المقالة وبنيتها
 */

(function(window) {
   'use strict';

   class StructureAnalyzer {
      constructor() {
         this.maxScore = 30;
      }

      /**
       * تحليل البنية
       * @param {UnifiedArticleModel} articleModel 
       * @returns {Object}
       */
      analyze(articleModel) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         // 1. تحليل المقدمة
         const intro = this._analyzeIntro(articleModel);
         results.details.intro = intro;

         // 2. تحليل الأقسام
         const sections = this._analyzeSections(articleModel);
         results.details.sections = sections;

         // 3. كشف الأقسام المفقودة
         const missingSections = this._detectMissingSections(articleModel);
         results.details.missingSections = missingSections;

         // 4. كشف الأقسام الفارغة
         const emptySections = this._detectEmptySections(articleModel);
         results.details.emptySections = emptySections;

         // 5. تقييم التوازن البنيوي
         const balance = this._assessBalance(articleModel);
         results.details.balance = balance;

         // 6. كشف نمط البذرة
         const isStub = this._isStubLike(articleModel);
         results.details.isStub = isStub;

         // 7. حساب النقاط
         results.score = this._calculateScore(results.details, articleModel);

         // 8. إنشاء الملاحظات
         results.notes = this._generateNotes(results.details, articleModel);

         return results;
      }

      /**
       * تحليل المقدمة
       * @private
       */
      _analyzeIntro(articleModel) {
         const introText = articleModel.cleanIntroText;
         const introLen = introText.length;
         const articleLen = articleModel.articleLength;

         // حساب النسبة المثالية (10-20%)
         const idealMin = articleLen * 0.10;
         const idealMax = articleLen * 0.20;
         const isOptimalLength = introLen >= idealMin && introLen <= idealMax;

         // تقسيم الجمل
         const sentences = introText
            .split(/[\.!\؟\?؛;]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

         let maxSentenceLen = 0;
         let longSentences = 0;

         sentences.forEach(s => {
            if (s.length > maxSentenceLen) maxSentenceLen = s.length;
            if (s.length > 200) longSentences++;
         });

         return {
            length: introLen,
            sentenceCount: sentences.length,
            maxSentenceLen,
            longSentences,
            isOptimalLength,
            percentageOfArticle: ((introLen / articleLen) * 100).toFixed(1)
         };
      }

      /**
       * تحليل الأقسام
       * @private
       */
      _analyzeSections(articleModel) {
         const sections = articleModel.sections;
         
         const levelCounts = {
            h2: 0,
            h3: 0,
            h4: 0,
            h5: 0,
            h6: 0
         };

         sections.forEach(section => {
            const level = parseInt(section.level);
            if (level === 2) levelCounts.h2++;
            else if (level === 3) levelCounts.h3++;
            else if (level === 4) levelCounts.h4++;
            else if (level === 5) levelCounts.h5++;
            else if (level === 6) levelCounts.h6++;
         });

         const structuralDepth = 
            (levelCounts.h2 > 0 ? 1 : 0) +
            (levelCounts.h3 > 0 ? 1 : 0) +
            (levelCounts.h4 > 0 ? 1 : 0);

         return {
            total: sections.length,
            levelCounts,
            structuralDepth
         };
      }

      /**
       * كشف الأقسام المفقودة المهمة
       * @private
       */
      _detectMissingSections(articleModel) {
         const sectionNames = articleModel.sections.map(s => s.line);
         const missing = [];

         // فحص الأقسام حسب نوع المقالة
         const articleTypes = articleModel.detectArticleType();

         // مراجع
         if (!sectionNames.some(n => /مراجع|references|مصادر/i.test(n))) {
            missing.push('مراجع');
         }

         // روابط خارجية (للمقالات الطويلة)
         if (articleModel.articleLength > 3000) {
            if (!sectionNames.some(n => /وصلات خارجية|external links|روابط خارجية/i.test(n))) {
               missing.push('وصلات خارجية');
            }
         }

         // انظر أيضاً (للمقالات المتقدمة)
         if (articleModel.articleLength > 5000) {
            if (!sectionNames.some(n => /انظر أيضا|see also/i.test(n))) {
               missing.push('انظر أيضاً');
            }
         }

         // أقسام خاصة بالسير الذاتية
         if (articleTypes.includes('biography')) {
            if (!sectionNames.some(n => /حياته|نشأته|سيرته|early life|biography/i.test(n))) {
               missing.push('قسم الحياة المبكرة');
            }
         }

         return missing;
      }

      /**
       * كشف الأقسام الفارغة
       * @private
       */
      _detectEmptySections(articleModel) {
         const emptySections = [];
         
         articleModel.$parsedContent.find('h2, h3, h4').each(function() {
            const $heading = $(this);
            const $next = $heading.nextUntil('h2, h3, h4');
            const text = $next.text().trim();
            
            if (text.length < 50) {
               emptySections.push($heading.text().trim());
            }
         });

         return emptySections;
      }

      /**
       * تقييم التوازن البنيوي
       * @private
       */
      _assessBalance(articleModel) {
         const articleLen = articleModel.articleLength;
         const h2Count = articleModel.sections.filter(s => s.level === 2).length;

         let isBalanced = true;
         let issue = null;

         // مقالات طويلة بدون أقسام كافية
         if (articleLen > 3000 && h2Count < 2) {
            isBalanced = false;
            issue = 'مقالة طويلة بدون أقسام كافية';
         }

         // أقسام كثيرة لمقالة قصيرة
         if (articleLen < 2000 && h2Count > 5) {
            isBalanced = false;
            issue = 'أقسام كثيرة لمقالة قصيرة';
         }

         return {
            isBalanced,
            issue
         };
      }

      /**
       * كشف نمط البذرة
       * @private
       */
      _isStubLike(articleModel) {
         return articleModel.sections.length <= 1 && articleModel.articleLength < 1500;
      }

      /**
       * حساب النقاط
       * @private
       */
      _calculateScore(details, articleModel) {
         let score = 0;
         const articleLen = articleModel.articleLength;

         // المقدمة (0-10)
         if (details.intro.isOptimalLength) {
            score += 10;
         } else if (details.intro.length >= 400) {
            score += 8;
         } else if (details.intro.length >= 300) {
            score += 6;
         } else if (details.intro.length >= 200) {
            score += 4;
         } else if (details.intro.length >= 150) {
            score += 2;
         }

         // البنية (0-12)
         if (details.isStub) {
            score += 0;
         } else if (articleLen < 2500) {
            score += 6;
         } else {
            if (details.sections.levelCounts.h2 >= 4) score += 10;
            else if (details.sections.levelCounts.h2 >= 3) score += 8;
            else if (details.sections.levelCounts.h2 >= 2) score += 6;
            else if (details.sections.levelCounts.h2 === 1) score += 3;

            if (details.sections.structuralDepth >= 3) score += 2;
            else if (details.sections.structuralDepth === 2) score += 1;
         }

         // الأقسام المهمة (0-3)
         const expectedSections = ['مراجع', 'وصلات خارجية', 'انظر أيضاً'];
         const presentCount = expectedSections.filter(s => !details.missingSections.includes(s)).length;
         score += presentCount;

         // التوازن (0-3)
         if (details.balance.isBalanced) score += 3;

         // عقوبة للأقسام الفارغة
         if (details.emptySections.length > 0) {
            score -= Math.min(3, details.emptySections.length);
         }

         // عقوبة للجمل الطويلة
         if (details.intro.longSentences > 0 && !articleModel.detectArticleType().includes('medical')) {
            score -= Math.min(2, details.intro.longSentences);
         }

         return Math.max(0, Math.min(this.maxScore, score));
      }

      /**
       * إنشاء الملاحظات
       * @private
       */
      _generateNotes(details, articleModel) {
         const notes = [];

         if (details.isStub) {
            notes.push('🚧 المقالة في مرحلة البذرة. يجب توسيعها وإضافة أقسام منظمة.');
         }

         if (!details.intro.isOptimalLength) {
            if (details.intro.length < 150) {
               notes.push(`📝 المقدمة قصيرة جدًا (${details.intro.length} حرفًا). يجب توسيعها لتلخص موضوع المقالة بشكل شامل.`);
            } else if (details.intro.percentageOfArticle < 10) {
               notes.push(`المقدمة قصيرة نسبيًا (${details.intro.percentageOfArticle}% من المقالة). المثالي: 10-20%.`);
            } else if (details.intro.percentageOfArticle > 20) {
               notes.push(`المقدمة طويلة نسبيًا (${details.intro.percentageOfArticle}% من المقالة). قد تحتاج إلى اختصار.`);
            }
         }

         if (!details.balance.isBalanced) {
            notes.push(`⚖️ ${details.balance.issue}. يُستحسن إعادة تنظيم البنية.`);
         }

         if (details.missingSections.length > 0) {
            notes.push(`📂 أقسام مفقودة مهمة: ${details.missingSections.join('، ')}`);
         }

         if (details.emptySections.length > 0) {
            notes.push(`⚠️ أقسام فارغة أو قصيرة جدًا: ${details.emptySections.slice(0, 3).join('، ')}`);
         }

         if (details.intro.longSentences > 0) {
            notes.push(`📏 ${details.intro.longSentences} جملة طويلة جدًا في المقدمة (أكثر من 200 حرف). يُفضل تقسيمها.`);
         }

         return notes;
      }
   }

   // تصدير
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.StructureAnalyzer = StructureAnalyzer;

})(window);
