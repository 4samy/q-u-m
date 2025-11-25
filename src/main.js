/**
 * main.js
 * Quality Ultra-Max v3 - المنسق الرئيسي
 * نظام تحليل جودة مقالات ويكيبيديا - عربي
 */

(function(window, $, mw) {
   'use strict';

   // التأكد من وجود namespace
   window.QualityUltraMax = window.QualityUltraMax || {};

   /**
    * المنسق الرئيسي لـ Quality Ultra-Max
    */
   class QualityUltraMaxOrchestrator {
      constructor() {
         this.modules = {
            dataFetcher: null,
            scoringEngine: null,
            analyzers: {},
            panelRenderer: null
         };
         
         this.isInitialized = false;
         this.isAnalyzing = false;
      }

      /**
       * تهيئة النظام
       */
      init() {
         if (this.isInitialized) {
            console.warn('[QUM] Already initialized');
            return;
         }

         // التحقق من المتطلبات
         if (!this._checkRequirements()) {
            console.error('[QUM] Requirements not met');
            return;
         }

         // تحميل الوحدات
         this._loadModules();

         // إضافة زر التشغيل
         this._injectButton();

         this.isInitialized = true;
         console.log('[QUM] Quality Ultra-Max v3 initialized ✓');
      }

      /**
       * التحقق من المتطلبات
       * @private
       */
      _checkRequirements() {
         // فقط في النطاق الرئيسي
         if (mw.config.get('wgNamespaceNumber') !== 0) {
            return false;
         }

         // التحقق من jQuery
         if (!$ || !$.fn) {
            console.error('[QUM] jQuery not available');
            return false;
         }

         // التحقق من mw.Api
         if (!mw || !mw.Api) {
            console.error('[QUM] MediaWiki API not available');
            return false;
         }

         return true;
      }

      /**
       * تحميل الوحدات
       * @private
       */
      _loadModules() {
         const QUM = window.QualityUltraMax;

         // Core modules
         this.modules.dataFetcher = new QUM.DataFetcher();
         this.modules.scoringEngine = new QUM.ScoringEngine();

         // Analyzers
         this.modules.analyzers = {
            media: new QUM.MediaAnalyzer(),
            reference: new QUM.ReferenceAnalyzer(),
            structure: new QUM.StructureAnalyzer(),
            link: new QUM.LinkAnalyzer(),
            grammar: new QUM.GrammarAnalyzer(),
            maintenance: new QUM.MaintenanceAnalyzer(),
            language: new QUM.LanguageAnalyzer(),
            revision: new QUM.RevisionAnalyzer(),
            wikidataIntegration: new QUM.WikidataIntegrationAnalyzer()
         };

         // UI
         this.modules.panelRenderer = new QUM.PanelRenderer();

         console.log('[QUM] All modules loaded ✓');
      }

      /**
       * إضافة زر التشغيل
       * @private
       */
      _injectButton() {
         const buttonHtml = `
            <li id="qum-button-container" class="mw-list-item">
               <a href="#" id="qum-analyze-btn" title="تحليل جودة المقالة">
                  <span>📊 تحليل الجودة</span>
               </a>
            </li>
         `;

         // Vector 2022
         if ($('#p-views ul').length) {
            $('#p-views ul').append(buttonHtml);
         }
         // Vector 2010 / Legacy
         else if ($('#p-cactions ul').length) {
            $('#p-cactions ul').append(buttonHtml);
         }
         // Fallback
         else if ($('.vector-menu-content-list').first().length) {
            $('.vector-menu-content-list').first().append(buttonHtml);
         }

         // ربط الحدث
         $('#qum-analyze-btn').on('click', (e) => {
            e.preventDefault();
            this.analyze();
         });

         console.log('[QUM] Button injected ✓');
      }

      /**
       * بدء التحليل
       */
      async analyze() {
         if (this.isAnalyzing) {
            mw.notify('التحليل قيد التنفيذ...', { type: 'warn' });
            return;
         }

         this.isAnalyzing = true;
         const $button = $('#qum-analyze-btn span');
         const originalText = $button.text();

         try {
            // تحديث النص
            $button.text('⏳ جارٍ التحليل...');

            // إظهار إشعار
            mw.notify('جارٍ جمع بيانات المقالة...', {
               type: 'info',
               tag: 'qum-progress'
            });

            // الخطوة 1: جمع البيانات
            const pageTitle = mw.config.get('wgPageName');
            const data = await this.modules.dataFetcher.fetchAll(pageTitle);

            // الخطوة 2: بناء نموذج المقالة
            mw.notify.close('qum-progress');
            mw.notify('جارٍ تحليل محتوى المقالة...', {
               type: 'info',
               tag: 'qum-progress'
            });

            // UnifiedArticleModel expects the raw data object
            const articleModel = new window.QualityUltraMax.UnifiedArticleModel(data);

            // الخطوة 3: تشغيل المحللات
            const analysisResults = await this._runAnalyzers(articleModel);

            // الخطوة 4: حساب النتيجة النهائية
            const finalResult = this.modules.scoringEngine.calculateFinalScore(analysisResults);

            // الخطوة 5: عرض النتائج
            this.modules.panelRenderer.render(finalResult);

            // إغلاق الإشعار
            mw.notify.close('qum-progress');
            mw.notify('تم التحليل بنجاح ✓', { type: 'success' });

            console.log('[QUM] Analysis complete:', finalResult);

         } catch (error) {
            console.error('[QUM] Analysis error:', error);
            mw.notify('حدث خطأ أثناء التحليل: ' + error.message, { type: 'error' });
         } finally {
            this.isAnalyzing = false;
            $button.text(originalText);
         }
      }

      /**
       * تشغيل جميع المحللات
       * @private
       */
      async _runAnalyzers(articleModel) {
         const results = {};

         // تشغيل المحللات
         try {
            const mediaResult = this.modules.analyzers.media.analyze(articleModel);
            const referenceResult = this.modules.analyzers.reference.analyze(articleModel);
            const structureResult = this.modules.analyzers.structure.analyze(articleModel);
            const linkResult = this.modules.analyzers.link.analyze(articleModel);
            const grammarResult = this.modules.analyzers.grammar.analyze(articleModel);
            const maintenanceResult = this.modules.analyzers.maintenance.analyze(articleModel);
            const languageResult = this.modules.analyzers.language.analyze(articleModel);
            
            // تحليل استقرار المقالة والمراجعات
            const revisionResult = this.modules.analyzers.revision.analyze(
               articleModel,
               articleModel.rawData,
               articleModel.$parsedContent
            );
            
            // تحليل تكامل ويكي بيانات والمشاريع الشقيقة
            const wikidataIntegrationResult = this.modules.analyzers.wikidataIntegration.analyze(
               articleModel,
               articleModel.rawData,
               articleModel.$parsedContent
            );

            // تنظيم النتائج بالصيغة المتوقعة
            results.mediaAnalysis = mediaResult;
            results.referenceAnalysis = referenceResult;
            results.structureAnalysis = structureResult;
            results.linkAnalysis = linkResult;
            results.grammarAnalysis = grammarResult;
            results.maintenanceAnalysis = maintenanceResult;
            results.languageAnalysis = languageResult;
            results.revisionAnalysis = revisionResult;
            results.wikidataIntegrationAnalysis = wikidataIntegrationResult;

         } catch (error) {
            console.error('[QUM] Analyzer error:', error);
            throw new Error('فشل تشغيل المحللات');
         }

         return results;
      }

      /**
       * إعادة تهيئة
       */
      reset() {
         this.isInitialized = false;
         this.isAnalyzing = false;
         $('#qum-button-container').remove();
         $('#qum-styles').remove();
         console.log('[QUM] Reset complete');
      }
   }

   /**
    * Bootloader: use mw.loader and wikipage hook for safe initialization on Wikipedia
    */
   mw.loader.using(['mediawiki.api', 'mediawiki.util']).then(function() {
      // only run in main article namespace
      if (mw.config.get('wgNamespaceNumber') !== 0) return;

      mw.hook('wikipage.content').add(function() {
         // التأكد من أن جميع الوحدات محملة
         if (
            window.QualityUltraMax.DataFetcher &&
            (window.QualityUltraMax.UnifiedArticleModel || window.QualityUltraMax.ArticleModel) &&
            window.QualityUltraMax.ScoringEngine &&
            window.QualityUltraMax.MediaAnalyzer &&
            window.QualityUltraMax.ReferenceAnalyzer &&
            window.QualityUltraMax.StructureAnalyzer &&
            window.QualityUltraMax.LinkAnalyzer &&
            window.QualityUltraMax.GrammarAnalyzer &&
            window.QualityUltraMax.MaintenanceAnalyzer &&
            window.QualityUltraMax.LanguageAnalyzer &&
            window.QualityUltraMax.PanelRenderer
         ) {
            const orchestrator = new QualityUltraMaxOrchestrator();
            orchestrator.init();

            // تصدير للوصول الخارجي
            window.QualityUltraMax.Orchestrator = orchestrator;
         } else {
            console.error('[QUM] Not all modules loaded. Cannot initialize.');
         }
      });
   }).catch(function(err) {
      console.error('[QUM] Failed to load required MediaWiki modules:', err);
   });

})(window, jQuery, mediaWiki);
