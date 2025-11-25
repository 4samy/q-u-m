/**
 * dataFetcher.js
 * مسؤول عن جلب جميع البيانات من MediaWiki API
 * يوفر واجهة موحدة لجلب محتوى المقالة وبياناتها
 */

(function(window) {
   'use strict';

   class DataFetcher {
      constructor() {
         this.api = new mw.Api();
         this.cache = new Map();
      }

      /**
       * جلب المقدمة (القسم 0) بشكل منفصل
       * @param {string} pageTitle 
       * @returns {Promise<string>}
       */
      async fetchIntro(pageTitle) {
         const cacheKey = `intro_${pageTitle}`;
         if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
         }

         try {
            const result = await this.api.get({
               action: 'parse',
               page: pageTitle,
               prop: 'wikitext',
               section: 0,
               formatversion: 2
            });

            const wikitext = result?.parse?.wikitext || '';
            this.cache.set(cacheKey, wikitext);
            return wikitext;
         } catch (error) {
            console.warn('فشل جلب المقدمة:', error);
            return '';
         }
      }

      /**
       * جلب الصفحة الكاملة المحللة
       * @param {string} pageTitle 
       * @returns {Promise<Object>}
       */
      async fetchFullPage(pageTitle) {
         const cacheKey = `full_${pageTitle}`;
         if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
         }

         try {
            const result = await this.api.get({
               action: 'parse',
               page: pageTitle,
               prop: 'text|wikitext|sections|images|externallinks|categories|templates',
               disablelimitreport: 1,
               disableeditsection: 1,
               disabletoc: 1,
               formatversion: 2
            });

            const parsed = result?.parse || null;
            this.cache.set(cacheKey, parsed);
            return parsed;
         } catch (error) {
            console.error('فشل جلب الصفحة الكاملة:', error);
            return null;
         }
      }

      /**
       * جلب قواعد الأخطاء النحوية
       * @returns {Promise<Array>}
       */
      async fetchGrammarRules() {
         const cacheKey = 'grammar_rules';
         if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
         }

         try {
            const result = await this.api.get({
               action: 'query',
               prop: 'revisions',
               titles: 'MediaWiki:Ar_gram_errors.json',
               rvprop: 'content',
               rvslots: 'main',
               formatversion: 2
            });

            const page = result?.query?.pages?.[0];
            if (!page || page.missing || !page.revisions?.[0]) {
               return this.getDefaultGrammarRules();
            }

            const content = page.revisions[0].slots.main.content;
            const rules = JSON.parse(content);
            
// rules قد تكون Object أو Array
let list = [];

if (Array.isArray(rules)) {
    list = rules;
} else if (typeof rules === "object" && rules !== null) {
    list = Object.values(rules);
} else {
    console.warn("Invalid grammar rules format:", rules);
    return this.getDefaultGrammarRules();
}

const processedRules = list.map(rule => ({
    pattern: new RegExp(rule.pattern, rule.flags || 'g'),
    description: rule.description || '',
    suggestion: rule.suggestion || ''
}));


            this.cache.set(cacheKey, processedRules);
            return processedRules;
         } catch (error) {
            console.warn('فشل جلب قواعد النحو:', error);
            return this.getDefaultGrammarRules();
         }
      }

      /**
       * جلب جميع البيانات المطلوبة بشكل متوازي
       * @param {string} pageTitle 
       * @returns {Promise<Object>}
       */
      async fetchAll(pageTitle) {
         try {
            const [introWikitext, fullParse, grammarRules] = await Promise.all([
               this.fetchIntro(pageTitle),
               this.fetchFullPage(pageTitle),
               this.fetchGrammarRules()
            ]);

            if (!fullParse) {
               throw new Error('فشل في جلب بيانات المقالة');
            }

            return {
               pageTitle,
               introWikitext,
               fullParse,
               grammarRules,
               fetchedAt: Date.now()
            };
         } catch (error) {
            console.error('خطأ في fetchAll:', error);
            throw error;
         }
      }

      /**
       * Backwards-compatible alias: fetch -> fetchAll
       * @param {string} pageTitle
       * @returns {Promise<Object>}
       */
      async fetch(pageTitle) {
         return this.fetchAll(pageTitle);
      }

      /**
       * قواعد نحوية افتراضية
       * @returns {Array}
       */
      getDefaultGrammarRules() {
         return [
            { pattern: /هاذا/g, description: 'خطأ إملائي: هاذا → هذا' },
            { pattern: /هاذه/g, description: 'خطأ إملائي: هاذه → هذه' },
            { pattern: /ذالك/g, description: 'خطأ إملائي: ذالك → ذلك' },
            { pattern: /لذالك/g, description: 'خطأ إملائي: لذالك → لذلك' },
            { pattern: /مسؤلية/g, description: 'خطأ إملائي: مسؤلية → مسؤولية' },
            { pattern: /إست(?!ان|قبل)/g, description: 'خطأ إملائي: إست → است' },
            { pattern: /\sالى\s/g, description: 'خطأ إملائي: الى → إلى' },
            { pattern: /حفض/g, description: 'خطأ إملائي: حفض → حفظ' },
            { pattern: /معضم/g, description: 'خطأ إملائي: معضم → معظم' },
            { pattern: /كده|كدا|كدة/g, description: 'تعبير عامي' },
            { pattern: /علشان|عشان/g, description: 'تعبير عامي' },
            { pattern: /جداً جداً/g, description: 'حشو لغوي' },
            { pattern: /هو كان|كانت هي/g, description: 'ترجمة آلية ركيكة' },
            { pattern: / ,/g, description: 'ترقيم خاطئ: مسافة قبل الفاصلة' },
            { pattern: /!!/g, description: 'ترقيم زائد' }
         ];
      }

      /**
       * مسح الذاكرة المؤقتة
       */
      clearCache() {
         this.cache.clear();
      }
   }

   // تصدير للاستخدام العام
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.DataFetcher = DataFetcher;

})(window);
