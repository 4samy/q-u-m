/**
 * wikidataIntegrationAnalyzer.js
 * محلل تكامل ويكي بيانات والمشاريع الشقيقة
 * يقيم جودة الربط مع ويكي بيانات والمشاريع الشقيقة
 */

(function(window) {
   'use strict';

   class WikidataIntegrationAnalyzer {
      constructor() {
         this.maxScore = 10;

         // قوالب ويكي بيانات
         this.wikidataTemplates = [
            'ويكي بيانات',
            'Wikidata',
            'استشهاد بويكي بيانات',
            'Cite Q'
         ];

         // قوالب الوصلات بين اللغات
         this.interwikiTemplates = [
            'وإو',
            'Interlanguage link',
            'Ill',
            'Ill-wd',
            'Interlang',
            'وصلة بين لغوية'
         ];

         // قوالب المشاريع الشقيقة
         this.sisterProjectTemplates = [
            'شقيقات ويكيميديا',
            'روابط شقيقة',
            'Commons',
            'Wikisource',
            'Wiktionary',
            'Wikiquote',
            'Wikibooks',
            'Wikinews',
            'Wikiversity',
            'Wikivoyage',
            'كومنز',
            'ويكي مصدر',
            'ويكاموس',
            'ويكي الاقتباس'
         ];

         // كلمات مفتاحية للبحث عن ويكي بيانات
         this.wikidataKeywords = [
            'wikibase',
            'wikidata.org',
            'wikidata',
            'p-wikibase-otherprojects'
         ];
      }

      /**
       * تحليل تكامل ويكي بيانات والمشاريع الشقيقة
       * @param {UnifiedArticleModel} articleModel 
       * @param {Object} articleData - بيانات المقالة الخام
       * @param {jQuery} $parsedArticle - المقالة المحللة
       * @returns {Object}
       */
      analyze(articleModel, articleData, $parsedArticle) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         // 1. كشف الربط مع ويكي بيانات
         const wikidataBinding = this._detectWikidataBinding($parsedArticle, articleModel);
         results.details.linkedToWikidata = wikidataBinding.linked;
         results.details.wikidataItemId = wikidataBinding.itemId;
         results.details.missingWikidataLink = !wikidataBinding.linked;

         // 2. كشف قوالب الوصلات بين اللغات
         const interwikiLinks = this._detectInterwikiLinks($parsedArticle, articleModel);
         results.details.usesInterwikiTemplate = interwikiLinks.count > 0;
         results.details.interwikiLinksCount = interwikiLinks.count;

         // 3. كشف قوالب المشاريع الشقيقة
         const sisterProjects = this._detectSisterProjectBoxes($parsedArticle, articleModel);
         results.details.sisterProjectBoxesCount = sisterProjects.count;

         // 4. تحديد المشاريع الشقيقة المفقودة
         results.details.missingSisterLinks = interwikiLinks.count === 0 && sisterProjects.count === 0;

         // 5. حساب عدد إشارات التكامل عبر المشاريع
         results.details.crossProjectSignalsCount = this._countCrossProjectSignals(results.details);

         // 6. الأمثلة
         results.details.examples = {
            interwikiLinks: interwikiLinks.examples,
            sisterBoxes: sisterProjects.examples,
            wikidataHints: wikidataBinding.hints
         };

         // 7. حساب درجة التكامل عبر المشاريع
         results.details.crossProjectScore = this._calculateCrossProjectScore(results.details);
         results.score = results.details.crossProjectScore;

         // 8. إنشاء الملاحظات
         results.notes = this._generateNotes(results.details, articleModel);

         return results;
      }

      /**
       * كشف الربط مع ويكي بيانات
       * @private
       */
      _detectWikidataBinding($parsedArticle, articleModel) {
         const result = {
            linked: false,
            itemId: null,
            hints: []
         };

         const pageHtml = $parsedArticle ? $parsedArticle.html() : '';
         const pageText = $parsedArticle ? $parsedArticle.text() : '';

         // البحث عن كلمات مفتاحية لويكي بيانات
         for (const keyword of this.wikidataKeywords) {
            if (pageHtml.includes(keyword) || pageText.includes(keyword)) {
               result.linked = true;
               break;
            }
         }

         // محاولة استخراج معرف ويكي بيانات
         const qidPatterns = [
            /wikidata\.org\/entity\/(Q\d+)/i,
            /wikidata\.org\/wiki\/(Q\d+)/i,
            /\bQ(\d{3,})\b/
         ];

         for (const pattern of qidPatterns) {
            const match = pageHtml.match(pattern);
            if (match) {
               result.itemId = match[1].startsWith('Q') ? match[1] : 'Q' + match[1];
               result.linked = true;
               break;
            }
         }

         // البحث عن قوالب ويكي بيانات
         this.wikidataTemplates.forEach(template => {
            const templatePattern = new RegExp(`{{\\s*${template}`, 'i');
            if (pageHtml.match(templatePattern)) {
               result.hints.push(template);
               result.linked = true;
            }
         });

         // البحث عن قسم المشاريع الشقيقة في ويكيبيديا
         if ($parsedArticle && $parsedArticle.find('#p-wikibase-otherprojects').length > 0) {
            result.linked = true;
         }

         return result;
      }

      /**
       * كشف قوالب الوصلات بين اللغات
       * @private
       */
      _detectInterwikiLinks($parsedArticle, articleModel) {
         const result = {
            count: 0,
            examples: []
         };

         const pageHtml = $parsedArticle ? $parsedArticle.html() : '';

         // البحث عن قوالب الوصلات بين اللغات
         this.interwikiTemplates.forEach(template => {
            // نمط مرن للبحث عن القوالب
            const patterns = [
               new RegExp(`{{\\s*${template}\\s*\\|([^}]+)}}`, 'gi'),
               new RegExp(`{{\\s*${template}\\s*}}`, 'gi')
            ];

            patterns.forEach(pattern => {
               const matches = pageHtml.matchAll(pattern);
               for (const match of matches) {
                  result.count++;
                  if (result.examples.length < 3) {
                     const templateContent = match[0].substring(0, 80);
                     result.examples.push({
                        template: template,
                        snippet: templateContent
                     });
                  }
               }
            });
         });

         return result;
      }

      /**
       * كشف قوالب المشاريع الشقيقة
       * @private
       */
      _detectSisterProjectBoxes($parsedArticle, articleModel) {
         const result = {
            count: 0,
            examples: []
         };

         const pageHtml = $parsedArticle ? $parsedArticle.html() : '';

         // البحث عن قوالب المشاريع الشقيقة
         this.sisterProjectTemplates.forEach(template => {
            const patterns = [
               new RegExp(`{{\\s*${template}\\s*\\|([^}]+)}}`, 'gi'),
               new RegExp(`{{\\s*${template}\\s*}}`, 'gi')
            ];

            patterns.forEach(pattern => {
               const matches = pageHtml.matchAll(pattern);
               for (const match of matches) {
                  result.count++;
                  if (result.examples.length < 3) {
                     result.examples.push({
                        project: template,
                        snippet: match[0].substring(0, 60)
                     });
                  }
               }
            });
         });

         // البحث عن روابط مباشرة للمشاريع الشقيقة
         const sisterProjectDomains = [
            'commons.wikimedia.org',
            'wikidata.org',
            'wikisource.org',
            'wiktionary.org',
            'wikiquote.org',
            'wikibooks.org',
            'wikinews.org'
         ];

         sisterProjectDomains.forEach(domain => {
            if (pageHtml.includes(domain)) {
               result.count++;
            }
         });

         return result;
      }

      /**
       * حساب عدد إشارات التكامل عبر المشاريع
       * @private
       */
      _countCrossProjectSignals(details) {
         let count = 0;

         if (details.linkedToWikidata) count++;
         if (details.usesInterwikiTemplate) count++;
         if (details.sisterProjectBoxesCount > 0) count++;
         if (details.wikidataItemId) count++;
         if (details.interwikiLinksCount >= 3) count++;

         return count;
      }

      /**
       * حساب درجة التكامل عبر المشاريع
       * @private
       */
      _calculateCrossProjectScore(details) {
         let score = 10; // البدء من الدرجة الكاملة

         // خصم على فقدان الربط مع ويكي بيانات
         if (details.missingWikidataLink) {
            score -= 4;
         }

         // خصم على فقدان الروابط الشقيقة
         if (details.missingSisterLinks) {
            score -= 2;
         }

         // خصم على عدم وجود صناديق المشاريع الشقيقة
         if (details.sisterProjectBoxesCount === 0) {
            score -= 1;
         }

         // مكافأة على وجود معرف ويكي بيانات
         if (details.wikidataItemId) {
            score += 1;
         }

         // مكافأة على وجود عدة وصلات بين لغوية
         if (details.interwikiLinksCount >= 3) {
            score += 1;
         }

         // مكافأة على وجود عدة صناديق للمشاريع الشقيقة
         if (details.sisterProjectBoxesCount >= 2) {
            score += 1;
         }

         // التأكد من بقاء النقاط في النطاق المقبول
         return Math.max(0, Math.min(this.maxScore, score));
      }

      /**
       * إنشاء الملاحظات
       * @private
       */
      _generateNotes(details, articleModel) {
         const notes = [];

         // فقدان الربط مع ويكي بيانات
         if (details.missingWikidataLink) {
            notes.push('⚠️ المقالة غير مربوطة بعنصر ويكي بيانات. يُنصح بإضافة ربط لتحسين التكامل مع المشاريع الشقيقة.');
         } else if (details.wikidataItemId) {
            notes.push(`✅ المقالة مربوطة بعنصر ويكي بيانات: ${details.wikidataItemId}`);
         }

         // الوصلات بين اللغات
         if (details.interwikiLinksCount === 0) {
            notes.push('المقالة لا تحتوي على وصلات بين لغوية. يُفضل إضافة قوالب مثل {{وإو}} لربط مقالات بلغات أخرى.');
         } else if (details.interwikiLinksCount >= 3) {
            notes.push(`✅ المقالة تحتوي على ${details.interwikiLinksCount} وصلة بين لغوية، مما يحسن التنقل بين اللغات.`);
         } else {
            notes.push(`المقالة تحتوي على ${details.interwikiLinksCount} وصلة بين لغوية فقط. يمكن إضافة المزيد لتحسين التكامل.`);
         }

         // صناديق المشاريع الشقيقة
         if (details.sisterProjectBoxesCount === 0) {
            notes.push('المقالة لا تحتوي على روابط للمشاريع الشقيقة. يُنصح بإضافة قوالب مثل {{شقيقات ويكيميديا}} للربط مع كومنز وويكي مصدر وغيرها.');
         } else if (details.sisterProjectBoxesCount >= 2) {
            notes.push(`✅ المقالة مربوطة بـ ${details.sisterProjectBoxesCount} مشروع شقيق، مما يثري المحتوى المتاح.`);
         } else {
            notes.push(`المقالة تحتوي على ربط مع ${details.sisterProjectBoxesCount} مشروع شقيق. يمكن إضافة المزيد من الروابط.`);
         }

         // تقييم عام
         if (details.crossProjectScore >= 8) {
            notes.push('🌟 التكامل مع ويكي بيانات والمشاريع الشقيقة ممتاز.');
         } else if (details.crossProjectScore >= 5) {
            notes.push('التكامل مع المشاريع الشقيقة جيد، لكن يمكن تحسينه.');
         } else {
            notes.push('التكامل مع المشاريع الشقيقة ضعيف. يُنصح بتحسين الربط مع ويكي بيانات والمشاريع الأخرى.');
         }

         return notes;
      }
   }

   // تصدير
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.WikidataIntegrationAnalyzer = WikidataIntegrationAnalyzer;

})(window);
