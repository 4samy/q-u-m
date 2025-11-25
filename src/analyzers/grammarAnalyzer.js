/**
 * grammarAnalyzer.js
 * محلل اللغة والأخطاء النحوية
 * يستخدم قواعد المجتمع لكشف الأخطاء اللغوية
 */

(function(window) {
   'use strict';

   class GrammarAnalyzer {
      constructor() {
         this.maxScore = 5; // جزء من نقاط البنية
      }

      analyze(articleModel) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         const firstParagraphs = this._getFirstParagraphs(articleModel, 3);
         const errors = this._detectErrors(firstParagraphs, articleModel.grammarRules);

         results.details.errorCount = errors.length;
         results.details.errors = errors.slice(0, 10); // أول 10 أخطاء

         const hasTranslationTemplate = articleModel.templates.some(t => 
            t.includes('ترجمة آلية') || t.includes('Translated')
         );
         results.details.hasTranslationTemplate = hasTranslationTemplate;

         // حساب النقاط
         let score = this.maxScore;

         if (errors.length === 0) {
            score = this.maxScore;
         } else if (errors.length <= 2) {
            score = 3;
         } else if (errors.length <= 5) {
            score = 2;
         } else if (errors.length <= 10) {
            score = 1;
         } else {
            score = 0;
         }

         if (hasTranslationTemplate) {
            score -= 2;
         }

         results.score = Math.max(0, Math.min(this.maxScore, score));

         // الملاحظات
         if (errors.length > 0) {
            results.notes.push(`📝 تم رصد ${errors.length} خطأ لغوي محتمل في بداية المقال. يُستحسن المراجعة اللغوية.`);
         }

         if (hasTranslationTemplate) {
            results.notes.push('⚠️ المقالة تحتوي على قالب ترجمة آلية. يجب مراجعتها وتحسين الصياغة.');
         }

         return results;
      }

      _getFirstParagraphs(articleModel, count) {
         let result = '';
         let found = 0;

         articleModel.$parsedContent.find('p').each(function() {
            const txt = $(this).text().trim();
            if (txt.length >= 30) {
               result += ' ' + txt;
               found++;
            }
            if (found >= count) {
               return false;
            }
         });

         return result;
      }

      _detectErrors(text, rules) {
         const errors = [];

         rules.forEach(rule => {
            const matches = text.match(rule.pattern);
            if (matches) {
               matches.forEach(match => {
                  errors.push({
                     match,
                     description: rule.description,
                     suggestion: rule.suggestion
                  });
               });
            }
         });

         return errors;
      }
   }

   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.GrammarAnalyzer = GrammarAnalyzer;

})(window);