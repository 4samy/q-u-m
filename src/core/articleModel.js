/**
 * articleModel.js
 * نموذج موحد للمقالة يجمع كل البيانات من DOM و API
 * يوفر واجهة قياسية لجميع المحللات
 */

(function(window) {
   'use strict';

   class UnifiedArticleModel {
      constructor(rawData) {
            // احتفظ بالبيانات الخام لعمليات المحللات التي تحتاجها
            this.rawData = rawData;
         this.title = rawData.pageTitle;
         this.introWikitext = rawData.introWikitext;

         // handle different shapes returned by MediaWiki parse API
         // `text` may be a string or an object like {"*": "..."}
         const fullParse = rawData.fullParse || {};
         // parse.text may be a string or an object with a '*' key
         this.html = (typeof fullParse.text === 'string') ? fullParse.text : ((fullParse.text && fullParse.text['*']) || '');

         // wikitext may be direct string or inside an object
         this.wikitext = (typeof fullParse.wikitext === 'string') ? fullParse.wikitext : (fullParse.wikitext && fullParse.wikitext['*']) || '';

         this.sections = fullParse.sections || [];
         this.images = fullParse.images || [];
         this.externallinks = fullParse.externallinks || [];

         // categories and templates may come in different shapes; be defensive
         this.categories = (fullParse.categories || []).map(c => {
            if (!c) return '';
            return c.category || c.title || c['*'] || String(c);
         }).filter(Boolean);

         this.templates = (fullParse.templates || []).map(t => {
            if (!t) return '';
            return t.title || t['*'] || String(t);
         }).filter(Boolean);
         this.grammarRules = rawData.grammarRules || [];
         
         // إنشاء DOM محلل
         this.$parsedContent = this._normalizeContent(this.html);
         
         // استخراج عناصر DOM المهمة
         this._extractDOMElements();
         
         // تنظيف النص
         this.cleanIntroText = this._extractCleanIntro();
         this.fullText = this.$parsedContent.text() || '';
         this.articleLength = (this.fullText || '').trim().length;
      }

      /**
       * تطبيع المحتوى وتغليفه في .mw-parser-output
       * @private
       */
      _normalizeContent(html) {
         if (!html) {
            return $('<div class="mw-parser-output"></div>');
         }

         const $temp = $('<div>').html(html);
         let $content = $temp.find('.mw-parser-output').first();

         if (!$content.length) {
            $content = $('<div class="mw-parser-output"></div>').html(html);
         }

         return $content;
      }

      /**
       * استخراج عناصر DOM المهمة
       * @private
       */
      _extractDOMElements() {
         // صندوق المعلومات
         this.$infobox = this.$parsedContent.find('.infobox').first();
         
         // محتوى المقالة النظيف (بدون عناصر جانبية)
         this.$articleBody = this._getCleanArticleBody();
         
         // قسم المراجع
         this.$referencesSection = this.$parsedContent.find('ol.references');
      }

      /**
       * الحصول على محتوى المقالة النظيف
       * @private
       */
      _getCleanArticleBody() {
         const $clone = this.$parsedContent.clone();
         
         // إزالة العناصر غير المقالية
         $clone.find(`
            .infobox,
            .navbox,
            .vertical-navbox,
            .sidebar,
            .sistersitebox,
            .mbox-small,
            .metadata,
            .ambox,
            .tmbox,
            .catlinks,
            .noprint,
            .mw-authority-control,
            .navbox-styles,
            table[role="navigation"],
            table[role="presentation"],
            .toc,
            .hatnote,
            .dablink,
            .reflist,
            #coordinates
         `).remove();

         // إزالة المحتوى بعد قسم المراجع
         const $refsHeading = $clone.find('h2').filter(function() {
            const text = $(this).text();
            return /مراجع|references|مصادر|ملاحظات|الهوامش|وصلات خارجية|external links/i.test(text);
         }).first();

         if ($refsHeading.length > 0) {
            $refsHeading.nextAll().remove();
            $refsHeading.remove();
         }

         return $clone;
      }

      /**
       * استخراج نص المقدمة النظيف
       * @private
       */
      _extractCleanIntro() {
         if (this.introWikitext) {
            let text = this.introWikitext;

            // إزالة التعليقات
            text = text.replace(/<!--[\s\S]*?-->/g, '');

            // إزالة القوالب بشكل تكراري
            let prevText = '';
            while (prevText !== text) {
               prevText = text;
               text = text.replace(/\{\{[^{}]*\}\}/g, '');
            }

            // إزالة الروابط الخارجية
            text = text.replace(/\[https?:\/\/[^\]]+\]/g, '');

            // إزالة الروابط الداخلية والحفاظ على النص
            text = text.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');

            // إزالة المراجع
            text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
            text = text.replace(/<ref[^>]*\/>/gi, '');

            // إزالة وسوم HTML
            text = text.replace(/<[^>]+>/g, '');

            // إزالة التنسيقات
            text = text.replace(/'{2,5}([^']+)'{2,5}/g, '$1');

            // إزالة أوامر خاصة
            text = text.replace(/__[A-Z]+__/g, '');

            // تنظيف المسافات
            text = text.replace(/\s+/g, ' ').trim();

            return text;
         }

         // احتياطي
         return this.$parsedContent.find('p').first().text().trim();
      }

      /**
       * الحصول على عدد الكلمات
       */
      getWordCount() {
            const txt = (this.fullText || '').trim();
            if (!txt) return 0;
            return txt.split(/\s+/).filter(Boolean).length;
      }

      /**
       * الحصول على قائمة الروابط الداخلية
       */
      getInternalLinks() {
         const links = [];
         
         this.$articleBody.find('a').each(function() {
            const href = $(this).attr('href');
            if (!href) return;
            
            const isWikiLink = href.startsWith('/wiki/') || 
                              href.startsWith('./') || 
                              href.includes('/w/index.php?title=');
            
            if (isWikiLink && !$(this).hasClass('new')) {
               if (!href.includes(':') || 
                   !href.match(/\/(ملف|صورة|File|Image|تصنيف|Category|ويكيبيديا|Wikipedia|قالب|Template|مساعدة|Help|بوابة|Portal):/i)) {
                  links.push(href);
               }
            }
         });

         return [...new Set(links)];
      }

      /**
       * الحصول على قائمة الروابط الحمراء
       */
      getRedLinks() {
         const redLinks = [];
         
         this.$articleBody.find('a.new').each(function() {
            redLinks.push($(this).attr('href'));
         });

         return redLinks;
      }

      /**
       * كشف نوع المقالة
       */
      detectArticleType() {
         const types = [];

         // طبية
         const medicalKeywords = ['طب', 'طبي', 'مرض', 'علاج', 'دواء', 'جراحة'];
         if (medicalKeywords.some(k => this.fullText.includes(k))) {
            types.push('medical');
         }

         // جغرافية
         if (this.$infobox.length && this.$infobox.text().includes('إحداثيات')) {
            types.push('geographic');
         }

         // سيرة ذاتية
         const bioTemplates = this.templates.filter(t => 
            /صندوق معلومات شخص|معلومات شخصية|Infobox person/i.test(t)
         );
         if (bioTemplates.length > 0) {
            types.push('biography');
         }

         return types;
      }

      /**
       * تصدير كـ JSON
       */
      toJSON() {
         return {
            title: this.title,
            articleLength: this.articleLength,
            wordCount: this.getWordCount(),
            sectionsCount: this.sections.length,
            imagesCount: this.images.length,
            categoriesCount: this.categories.length,
            types: this.detectArticleType()
         };
      }
   }

   // تصدير
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.UnifiedArticleModel = UnifiedArticleModel;

   // توافق اسم قديم (ArticleModel)
   window.QualityUltraMax.ArticleModel = UnifiedArticleModel;

})(window);
