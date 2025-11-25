/**
 * linkAnalyzer.js
 * محلل الروابط الداخلية والخارجية
 * يقيم جودة وكثافة الربط في المقالة
 */

(function(window) {
   'use strict';

   class LinkAnalyzer {
      constructor() {
         this.maxScore = 15;
      }

      analyze(articleModel) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         const internalLinks = articleModel.getInternalLinks();
         const redLinks = articleModel.getRedLinks();
         const externalLinks = articleModel.$articleBody.find('a.external').length;
         const wordCount = articleModel.getWordCount();
         const linkDensity = wordCount > 0 ? (internalLinks.length / wordCount * 100).toFixed(2) : 0;

         results.details.internalLinks = internalLinks.length;
         results.details.redLinks = redLinks.length;
         results.details.externalLinks = externalLinks;
         results.details.linkDensity = parseFloat(linkDensity);
         results.details.wordCount = wordCount;

         // حساب النقاط
         let score = 0;

         if (internalLinks.length >= 30) score += 10;
         else if (internalLinks.length >= 20) score += 8;
         else if (internalLinks.length >= 10) score += 6;
         else if (internalLinks.length >= 5) score += 4;
         else if (internalLinks.length >= 2) score += 2;

         if (externalLinks >= 1) score += 2;

         if (linkDensity >= 1.5 && linkDensity <= 5) score += 3;
         else if (linkDensity >= 0.5 && linkDensity < 1.5) score += 2;
         else if (linkDensity >= 0.2) score += 1;

         const totalLinks = internalLinks.length + redLinks.length;
         if (totalLinks > 0) {
            const redRatio = redLinks.length / totalLinks;
            if (redRatio > 0.4) score -= 4;
            else if (redRatio > 0.2) score -= 2;
         }

         results.score = Math.max(0, Math.min(this.maxScore, score));

         // الملاحظات
         if (internalLinks.length < 5) {
            results.notes.push('🔗 عدد الروابط الداخلية قليل جدًا. يُستحسن ربط المصطلحات المهمة.');
         } else if (internalLinks.length < 10 && articleModel.articleLength >= 2000) {
            results.notes.push('عدد الروابط الداخلية أقل من المتوقع لحجم المقالة.');
         }

         if (totalLinks > 0 && (redLinks.length / totalLinks) > 0.3) {
            results.notes.push(`⚠️ نسبة الروابط الحمراء مرتفعة (${((redLinks.length/totalLinks)*100).toFixed(0)}%). يُفضل إنشاء هذه الصفحات أو إزالة الروابط.`);
         }

         if (linkDensity < 0.5) {
            results.notes.push('كثافة الروابط منخفضة. يُفضل إضافة المزيد من الروابط الداخلية.');
         } else if (linkDensity > 7) {
            results.notes.push('كثافة الروابط مرتفعة جدًا. قد يكون هناك إفراط في الربط.');
         }

         return results;
      }
   }

   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.LinkAnalyzer = LinkAnalyzer;

})(window);