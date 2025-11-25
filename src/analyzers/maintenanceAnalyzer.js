/**
 * maintenanceAnalyzer.js
 * محلل الصيانة والتصنيفات
 * يقيم حالة الصيانة والتنظيم التصنيفي
 */

(function(window) {
   'use strict';

   class MaintenanceAnalyzer {
      constructor() {
         this.maxScore = 20;
      }

      analyze(articleModel) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         // 1. عد قوالب الصيانة
         const maintenanceTemplates = this._countMaintenanceTemplates(articleModel);
         results.details.maintenanceTemplates = maintenanceTemplates;

         // 2. عد التصنيفات
         const categories = articleModel.categories.length;
         results.details.categories = categories;

         // 3. كشف قوالب محددة
         const specificTemplates = this._detectSpecificTemplates(articleModel);
         results.details.hasOrphanTemplate = specificTemplates.orphan;
         results.details.hasStubTemplate = specificTemplates.stub;
         results.details.hasCleanupTemplate = specificTemplates.cleanup;

         // 4. حساب النقاط
         results.score = this._calculateScore(results.details);

         // 5. الملاحظات
         results.notes = this._generateNotes(results.details);

         return results;
      }

      _countMaintenanceTemplates(articleModel) {
         return articleModel.$parsedContent.find(`
            .ambox,
            .cleanup,
            .mw-maintenance,
            .metadata
         `).length;
      }

      _detectSpecificTemplates(articleModel) {
         return {
            orphan: articleModel.templates.some(t => /يتيم|orphan/i.test(t)),
            stub: articleModel.templates.some(t => /بذرة|stub/i.test(t)),
            cleanup: articleModel.templates.some(t => /تنظيف|cleanup/i.test(t))
         };
      }

      _calculateScore(details) {
         let score = 0;

         // قوالب الصيانة (0-12)
         if (details.maintenanceTemplates === 0) score += 12;
         else if (details.maintenanceTemplates === 1) score += 8;
         else if (details.maintenanceTemplates === 2) score += 5;
         else if (details.maintenanceTemplates <= 4) score += 2;

         // التصنيفات (0-8)
         if (details.categories >= 5) score += 8;
         else if (details.categories >= 3) score += 6;
         else if (details.categories >= 1) score += 4;

         return Math.max(0, Math.min(this.maxScore, score));
      }

      _generateNotes(details) {
         const notes = [];

         if (details.maintenanceTemplates > 0) {
            notes.push(`🧹 المقالة تحتوي على ${details.maintenanceTemplates} قالب صيانة. يجب معالجة المشاكل المذكورة.`);
         }

         if (details.categories === 0) {
            notes.push('📂 المقالة غير مُصنفة. يجب إضافة تصنيفات مناسبة.');
         } else if (details.categories < 3) {
            notes.push('عدد التصنيفات قليل. يُفضل إضافة تصنيفات أكثر تحديدًا.');
         }

         if (details.hasOrphanTemplate) {
            notes.push('المقالة يتيمة (لا توجد مقالات تشير إليها). يجب ربطها بمقالات أخرى.');
         }

         if (details.hasStubTemplate) {
            notes.push('المقالة مصنفة كبذرة. يُفضل توسيعها.');
         }

         return notes;
      }
   }

   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.MaintenanceAnalyzer = MaintenanceAnalyzer;

})(window);
