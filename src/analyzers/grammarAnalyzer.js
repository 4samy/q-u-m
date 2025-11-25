/**
 * grammarAnalyzer.js
 * محلل اللغة والأخطاء النحوية
 * يستخدم قواعد المجتمع لكشف الأخطاء اللغوية
 */

(function(window) {
   'use strict';

   class GrammarAnalyzer {
      constructor() {
         this.maxScore = 5;
      }

      analyze(articleModel) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         const firstParagraphs = this._getFirstParagraphs(articleModel, 3);

         const grammarRules = Array.isArray(articleModel.grammarRules)
            ? articleModel.grammarRules
            : [];

         const errors = this._detectErrors(firstParagraphs || '', grammarRules);

         results.details.errorCount = errors.length;
         results.details.errors = errors.slice(0, 10);

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

         if (!Array.isArray(rules)) {
            console.warn('[QUM] Grammar rules malformed. Falling back to empty array.');
            return errors;
         }

         rules.forEach(rule => {
            if (!rule || !rule.pattern) return;

            try {
               const regex = rule.pattern instanceof RegExp
                  ? rule.pattern
                  : new RegExp(rule.pattern, rule.flags || 'g');

               const matches = text.match(regex);

               if (matches) {
                  matches.forEach(match => {
                     errors.push({
                        match,
                        description: rule.description || '',
                        suggestion: rule.suggestion || ''
                     });
                  });
               }
            } catch (e) {
               console.error('[QUM] Invalid grammar rule pattern:', rule, e);
            }
         });

         return errors;
      }
   }

   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.GrammarAnalyzer = GrammarAnalyzer;

})(window);
