/**
 * revisionAnalyzer.js
 * محلل استقرار المقالة والمراجعات
 * يقيم استقرار المقالة بناءً على إشارات تحريرية ومؤشرات الاستقرار
 */

(function(window) {
   'use strict';

   class RevisionAnalyzer {
      constructor() {
         this.maxScore = 10;

         // قوالب الصيانة التي تدل على قلة المراجعين
         this.lowQualityTemplates = [
            'غير مراجعة',
            'يتيمة',
            'تنظيف',
            'بذرة',
            'مصدر',
            'لا مصدر',
            'مراجع',
            'توضيح'
         ];

         // قوالب حروب التحرير
         this.editWarTemplates = [
            'تعارض تحرير',
            'خلاف تحريري',
            'نزاع محايد'
         ];

         // كلمات مفتاحية للاسترجاع
         this.revertKeywords = [
            'Reverted',
            'استرجاع',
            'تراجع',
            'تراجع عن تعديل',
            'Undid',
            'Revert'
         ];

         // كلمات مفتاحية للحماية
         this.protectionKeywords = [
            'هذه الصفحة محمية',
            'صفحة محمية',
            'محمية كلياً',
            'محمية جزئياً',
            'padlock',
            'قفل'
         ];
      }

      /**
       * تحليل استقرار المقالة
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

         // 1. تقدير التعديلات في آخر 90 يوم
         const estimatedEdits = this._estimateRecentEdits($parsedArticle, articleModel);
         results.details.estimatedEditsLast90Days = estimatedEdits;

         // 2. تقدير عدد المحررين الفريدين
         const estimatedEditors = this._estimateUniqueEditors(articleModel, $parsedArticle);
         results.details.estimatedUniqueEditors = estimatedEditors;

         // 3. كشف التعديلات الكبيرة غير المتوازنة
         const largeEdits = this._detectLargeEdits(articleModel);
         results.details.largeEditsCount = largeEdits.count;

         // 4. كشف حروب التحرير
         const editWars = this._detectEditWars($parsedArticle, articleModel);
         results.details.hasEditWars = editWars;

         // 5. كشف الحماية
         const protection = this._detectProtection($parsedArticle);
         results.details.hasProtection = protection;

         // 6. حساب عدد إشارات عدم الاستقرار
         const revisionSignals = this._countRevisionSignals(results.details);
         results.details.revisionSignalsCount = revisionSignals;

         // 7. الأمثلة
         results.details.examples = {
            largeEdits: largeEdits.examples,
            instabilitySignals: this._collectInstabilitySignals(results.details)
         };

         // 8. حساب درجة الاستقرار
         results.details.stabilityScore = this._calculateStabilityScore(results.details);
         results.score = results.details.stabilityScore;

         // 9. إنشاء الملاحظات
         results.notes = this._generateNotes(results.details, articleModel);

         return results;
      }

      /**
       * تقدير عدد التعديلات الأخيرة بناءً على تاريخ آخر تعديل
       * @private
       */
      _estimateRecentEdits($parsedArticle, articleModel) {
         // البحث عن تاريخ آخر تعديل في HTML
         let lastEditDate = null;
         
         // محاولة إيجاد "آخر تعديل" أو "Last edited"
         const $page = $parsedArticle || $('body');
         const pageText = $page.text();

         // البحث عن أنماط التاريخ
         const datePatterns = [
            /آخر تعديل.*?(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+(\d{4})/,
            /Last edited.*?(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/,
            /تم التعديل.*?(\d{4})-(\d{2})-(\d{2})/
         ];

         let foundDate = false;
         for (const pattern of datePatterns) {
            const match = pageText.match(pattern);
            if (match) {
               foundDate = true;
               // تقدير بسيط: نفترض أن التعديل الأخير كان حديثاً
               break;
            }
         }

         // التقدير بناءً على طول المقالة وجودتها
         const articleLength = articleModel.articleLength || 0;
         const hasReferences = articleModel.sections && articleModel.sections.some(s => 
            s.line && (s.line.includes('مراجع') || s.line.includes('References'))
         );

         // إذا وجدنا تاريخاً، نفترض نشاطاً معقولاً
         if (foundDate) {
            if (articleLength > 5000 && hasReferences) {
               return 30; // مقالة نشطة
            } else if (articleLength > 2000) {
               return 20; // نشاط متوسط
            } else {
               return 10; // نشاط قليل
            }
         }

         // إذا لم نجد تاريخاً، نفترض نشاطاً قليلاً
         return articleLength > 3000 ? 15 : 5;
      }

      /**
       * تقدير عدد المحررين الفريدين
       * @private
       */
      _estimateUniqueEditors(articleModel, $parsedArticle) {
         let estimatedEditors = 1;

         // عد قوالب الصيانة (كلما قل عددها، زاد احتمال وجود محررين أكثر)
         let maintenanceCount = 0;
         const pageHtml = $parsedArticle ? $parsedArticle.html() : '';
         
         this.lowQualityTemplates.forEach(template => {
            if (pageHtml.includes(template)) {
               maintenanceCount++;
            }
         });

         // إذا كانت قوالب الصيانة كثيرة، المقالة غير مراجعة جيداً
         if (maintenanceCount > 3) {
            estimatedEditors = 1;
         } else if (maintenanceCount > 1) {
            estimatedEditors = 2;
         } else {
            // مقالة ذات جودة أعلى = محررون أكثر
            const hasReferences = articleModel.sections && articleModel.sections.some(s => 
               s.line && (s.line.includes('مراجع') || s.line.includes('References'))
            );
            const sectionCount = articleModel.sections ? articleModel.sections.length : 0;

            if (articleModel.articleLength > 5000 && hasReferences && sectionCount >= 5) {
               estimatedEditors = 5;
            } else if (articleModel.articleLength > 3000 && sectionCount >= 3) {
               estimatedEditors = 4;
            } else if (articleModel.articleLength > 1500) {
               estimatedEditors = 3;
            } else {
               estimatedEditors = 2;
            }
         }

         return estimatedEditors;
      }

      /**
       * كشف التعديلات الكبيرة غير المتوازنة
       * @private
       */
      _detectLargeEdits(articleModel) {
         const examples = [];
         let count = 0;

         if (!articleModel.sections || articleModel.sections.length === 0) {
            return { count: 0, examples: [] };
         }

         // فحص طول الأقسام
         articleModel.sections.forEach(section => {
            if (!section.line) return;

            // تقدير طول القسم بناءً على المحتوى
            const sectionText = section.content || '';
            const sectionLength = sectionText.length;

            // قسم كبير جداً (أكثر من 4000 حرف)
            if (sectionLength > 4000) {
               count++;
               if (examples.length < 3) {
                  examples.push({
                     section: section.line,
                     issue: 'قسم كبير جداً',
                     length: sectionLength
                  });
               }
            }
            // قسم صغير جداً (أقل من 80 حرف) - باستثناء المقدمة والمراجع
            else if (sectionLength > 0 && sectionLength < 80 && 
                     !section.line.includes('مراجع') && 
                     !section.line.includes('References') &&
                     !section.line.includes('وصلات خارجية')) {
               count++;
               if (examples.length < 3) {
                  examples.push({
                     section: section.line,
                     issue: 'قسم صغير جداً',
                     length: sectionLength
                  });
               }
            }
         });

         return { count, examples };
      }

      /**
       * كشف حروب التحرير
       * @private
       */
      _detectEditWars($parsedArticle, articleModel) {
         const pageHtml = $parsedArticle ? $parsedArticle.html() : '';
         const pageText = $parsedArticle ? $parsedArticle.text() : '';

         // فحص قوالب حروب التحرير
         for (const template of this.editWarTemplates) {
            if (pageHtml.includes(template)) {
               return true;
            }
         }

         // فحص كلمات الاسترجاع
         for (const keyword of this.revertKeywords) {
            if (pageText.includes(keyword)) {
               return true;
            }
         }

         return false;
      }

      /**
       * كشف حماية الصفحة
       * @private
       */
      _detectProtection($parsedArticle) {
         const pageHtml = $parsedArticle ? $parsedArticle.html() : '';
         const pageText = $parsedArticle ? $parsedArticle.text() : '';

         // فحص كلمات الحماية
         for (const keyword of this.protectionKeywords) {
            if (pageHtml.includes(keyword) || pageText.includes(keyword)) {
               return true;
            }
         }

         // فحص أيقونة القفل
         if ($parsedArticle && $parsedArticle.find('.mw-indicators-protection').length > 0) {
            return true;
         }

         return false;
      }

      /**
       * حساب عدد إشارات عدم الاستقرار
       * @private
       */
      _countRevisionSignals(details) {
         let count = 0;

         if (details.estimatedEditsLast90Days > 40) count++;
         if (details.estimatedUniqueEditors < 2) count++;
         if (details.largeEditsCount > 3) count++;
         if (details.hasEditWars) count++;
         if (details.hasProtection) count++;

         return count;
      }

      /**
       * جمع إشارات عدم الاستقرار
       * @private
       */
      _collectInstabilitySignals(details) {
         const signals = [];

         if (details.estimatedEditsLast90Days > 40) {
            signals.push('عدد كبير من التعديلات الأخيرة (أكثر من 40)');
         }

         if (details.estimatedUniqueEditors < 2) {
            signals.push('عدد قليل من المحررين (أقل من 2)');
         }

         if (details.largeEditsCount > 3) {
            signals.push(`عدد كبير من الأقسام غير المتوازنة (${details.largeEditsCount})`);
         }

         if (details.hasEditWars) {
            signals.push('إشارات إلى حروب تحرير');
         }

         if (details.hasProtection) {
            signals.push('الصفحة محمية');
         }

         return signals;
      }

      /**
       * حساب درجة الاستقرار
       * @private
       */
      _calculateStabilityScore(details) {
         let score = 10; // البدء من الدرجة الكاملة

         // خصم بناءً على عدد التعديلات
         if (details.estimatedEditsLast90Days > 40) {
            score -= 2;
         }

         // خصم على قلة المحررين
         if (details.estimatedUniqueEditors < 2) {
            score -= 1;
         }

         // خصم على التعديلات الكبيرة غير المتوازنة
         if (details.largeEditsCount > 3) {
            score -= 2;
         }

         // خصم كبير على حروب التحرير
         if (details.hasEditWars) {
            score -= 3;
         }

         // خصم على الحماية
         if (details.hasProtection) {
            score -= 1;
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

         // تعديلات كثيرة
         if (details.estimatedEditsLast90Days > 40) {
            notes.push(`المقالة تشهد نشاطاً تحريرياً كثيفاً (تقدير: ${details.estimatedEditsLast90Days} تعديل في آخر 90 يوم). قد يشير هذا إلى مقالة نشطة أو غير مستقرة.`);
         } else if (details.estimatedEditsLast90Days < 10) {
            notes.push('المقالة تشهد نشاطاً تحريرياً قليلاً. قد تحتاج إلى مزيد من التطوير والتحديث.');
         }

         // محررون قليلون
         if (details.estimatedUniqueEditors < 2) {
            notes.push('المقالة يبدو أنها من إنشاء محرر واحد أو عدد قليل جداً من المحررين. يُفضل تعاون عدة محررين لتحسين الجودة.');
         } else if (details.estimatedUniqueEditors >= 5) {
            notes.push('المقالة تبدو أنها من تطوير عدة محررين، مما يدل على تعاون جيد ومراجعة متعددة.');
         }

         // أقسام غير متوازنة
         if (details.largeEditsCount > 3) {
            notes.push(`تحتوي المقالة على ${details.largeEditsCount} قسم/أقسام غير متوازنة (كبيرة جداً أو صغيرة جداً). يُنصح بمراجعة توزيع المحتوى.`);
         }

         // حروب تحرير
         if (details.hasEditWars) {
            notes.push('⚠️ تم اكتشاف إشارات إلى حروب تحرير أو خلافات تحريرية. قد تحتاج المقالة إلى وساطة أو مراجعة محايدة.');
         }

         // حماية
         if (details.hasProtection) {
            notes.push('🔒 الصفحة محمية. هذا قد يشير إلى حروب تحرير سابقة أو محتوى حساس.');
         }

         // استقرار جيد
         if (details.stabilityScore >= 8 && !details.hasEditWars) {
            notes.push('✅ المقالة تبدو مستقرة وذات جودة تحريرية جيدة.');
         }

         return notes;
      }
   }

   // تصدير
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.RevisionAnalyzer = RevisionAnalyzer;

})(window);
