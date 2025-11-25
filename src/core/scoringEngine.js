/**
 * scoringEngine.js
 * محرك التقييم المركزي
 * يجمع نتائج المحللات ويحسب النقاط النهائية
 */

(function(window) {
   'use strict';

   class ScoringEngine {
      constructor() {
         // الأوزان القياسية
         this.weights = {
            structure: 0.25,    // 25%
            references: 0.25,   // 25%
            maintenance: 0.15,  // 15%
            links: 0.15,        // 15%
            media: 0.10,        // 10%
            language: 0.10      // 10% - التحليل اللغوي
         };

         // مستويات الجودة
         this.qualityLevels = [
            { min: 90, label: '💎 مقالة مميزة', class: 'featured' },
            { min: 80, label: '🌟 مقالة جيدة', class: 'good' },
            { min: 65, label: '✅ مقالة متقدمة', class: 'advanced' },
            { min: 50, label: '⚠️ مقالة بداية', class: 'start' },
            { min: 30, label: '📝 بذرية متطورة', class: 'stub-plus' },
            { min: 0, label: '🚨 بذرة', class: 'stub' }
         ];
      }

      /**
       * حساب النقاط النهائية
       * @param {Object} analysisResults - نتائج جميع المحللات
       * @returns {Object}
       */
      calculateFinalScore(analysisResults) {
         const {
            structureAnalysis,
            referenceAnalysis,
            mediaAnalysis,
            linkAnalysis,
            grammarAnalysis,
            maintenanceAnalysis,
            languageAnalysis
         } = analysisResults;

         // حساب نقاط التحليل اللغوي
         const languageScore = languageAnalysis ? this._calculateLanguageScore(languageAnalysis) : 10;

         // حساب نقاط المراجع مع المعايير المتقدمة
         const referencesScore = this._calculateReferencesScore(referenceAnalysis);

         // حساب نقاط الوسائط مع المعايير المتقدمة
         const mediaScore = this._calculateMediaScore(mediaAnalysis);

         // حساب النقاط الموزونة
         const scores = {
            structure: this._normalizeScore(structureAnalysis.score, 25),
            references: this._normalizeScore(referencesScore, 25),
            maintenance: this._normalizeScore(maintenanceAnalysis.score, 15),
            links: this._normalizeScore(linkAnalysis.score, 15),
            media: this._normalizeScore(mediaScore, 10),
            language: this._normalizeScore(languageScore, 10)
         };

         // المجموع النهائي
         const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
         const normalizedTotal = this._clamp(Math.round(total), 0, 100);

         // تحديد مستوى الجودة
         const qualityLevel = this._getQualityLevel(normalizedTotal);

         // جمع جميع الملاحظات
         const allNotes = this._collectNotes(analysisResults);

         const details = {
            structure: structureAnalysis,
            references: referenceAnalysis,
            media: mediaAnalysis,
            links: linkAnalysis,
            grammar: grammarAnalysis,
            maintenance: maintenanceAnalysis,
            language: languageAnalysis
         };

         // Include optional analyzers if present in the results
         if (analysisResults.revisionAnalysis) details.revision = analysisResults.revisionAnalysis;
         if (analysisResults.wikidataIntegrationAnalysis) details.wikidataIntegration = analysisResults.wikidataIntegrationAnalysis;

         return {
            total: normalizedTotal,
            level: qualityLevel.label,
            levelClass: qualityLevel.class,
            scores: scores,
            details: details,
            notes: allNotes,
            timestamp: Date.now()
         };
      }

      /**
       * تطبيع النقاط إلى الحد الأقصى المطلوب
       * @private
       */
      _normalizeScore(score, maxScore) {
         return this._clamp(score, 0, maxScore);
      }

      /**
       * تقييد القيمة ضمن نطاق
       * @private
       */
      _clamp(value, min, max) {
         return Math.max(min, Math.min(max, value));
      }

      /**
       * تحديد مستوى الجودة بناءً على النقاط
       * @private
       */
      _getQualityLevel(score) {
         for (const level of this.qualityLevels) {
            if (score >= level.min) {
               return level;
            }
         }
         return this.qualityLevels[this.qualityLevels.length - 1];
      }

      /**
       * جمع جميع الملاحظات من المحللات
       * @private
       */
      _collectNotes(analysisResults) {
         const notes = [];

         // ملاحظات البنية
         if (analysisResults.structureAnalysis.notes) {
            notes.push(...analysisResults.structureAnalysis.notes);
         }

         // ملاحظات المراجع
         if (analysisResults.referenceAnalysis.notes) {
            notes.push(...analysisResults.referenceAnalysis.notes);
         }

         // ملاحظات الوسائط
         if (analysisResults.mediaAnalysis.notes) {
            notes.push(...analysisResults.mediaAnalysis.notes);
         }

         // ملاحظات الروابط
         if (analysisResults.linkAnalysis.notes) {
            notes.push(...analysisResults.linkAnalysis.notes);
         }

         // ملاحظات اللغة
         if (analysisResults.grammarAnalysis.notes) {
            notes.push(...analysisResults.grammarAnalysis.notes);
         }

         // ملاحظات الصيانة
         if (analysisResults.maintenanceAnalysis.notes) {
            notes.push(...analysisResults.maintenanceAnalysis.notes);
         }

         // ملاحظات التحليل اللغوي
         if (analysisResults.languageAnalysis && analysisResults.languageAnalysis.notes) {
            notes.push(...analysisResults.languageAnalysis.notes);
         }

         return notes;
      }

      /**
       * حساب نقاط التحليل اللغوي
       * @private
       */
      _calculateLanguageScore(languageAnalysis) {
         let score = 10; // النقاط الكاملة

         // خصم نقاط على أنماط الترجمة الآلية
         if (languageAnalysis.machineTranslationSignals > 0) {
            const mtPenalty = Math.min(languageAnalysis.machineTranslationSignals * 0.1, 2);
            score -= mtPenalty;
         }

         // خصم نقاط على الأسلوب الضعيف
         if (languageAnalysis.weakStyleSignals > 0) {
            const stylePenalty = Math.min(languageAnalysis.weakStyleSignals * 0.1, 2);
            score -= stylePenalty;
         }

         // خصم نقاط على الأخطاء النحوية
         if (languageAnalysis.grammarViolations > 0) {
            const grammarPenalty = Math.min(languageAnalysis.grammarViolations * 0.15, 2);
            score -= grammarPenalty;
         }

         // خصم على الجمل الطويلة جداً
         if (languageAnalysis.longSentences > 5) {
            const longSentencePenalty = Math.min((languageAnalysis.longSentences - 5) * 0.2, 1.5);
            score -= longSentencePenalty;
         }

         // خصم على الفقرات الضعيفة
         if (languageAnalysis.emptyParagraphs > 2) {
            const emptyParaPenalty = Math.min((languageAnalysis.emptyParagraphs - 2) * 0.3, 1);
            score -= emptyParaPenalty;
         }

         // خصم على كثرة كلمات الحشو
         if (languageAnalysis.fillerWordsCount > 10) {
            const fillerPenalty = Math.min((languageAnalysis.fillerWordsCount - 10) * 0.05, 1);
            score -= fillerPenalty;
         }

         // خصم على الجمل التي تبدأ بحروف الجر
         if (languageAnalysis.prepositionStartSentences > 0) {
            const prepPenalty = Math.min(languageAnalysis.prepositionStartSentences * 0.08, 1.5);
            score -= prepPenalty;
         }

         // خصم على ضعف السرد
         if (languageAnalysis.narrativeWeaknessSignals > 0) {
            const narrativePenalty = Math.min(languageAnalysis.narrativeWeaknessSignals * 0.12, 1.5);
            score -= narrativePenalty;
         }

         // خصم على التكرار والتشابه
         if (languageAnalysis.redundantSentences > 0) {
            const redundancyPenalty = Math.min(languageAnalysis.redundantSentences * 0.25, 2);
            score -= redundancyPenalty;
         }

         // مكافأة على جودة علامات الترقيم
         if (languageAnalysis.punctuationScore > 70) {
            score += 0.5;
         }

         return Math.max(0, Math.min(10, score));
      }

      /**
       * حساب نقاط المراجع مع المعايير المتقدمة
       * @private
       */
      _calculateReferencesScore(referenceAnalysis) {
         // البدء بالنقاط الأساسية من المحلل
         let score = referenceAnalysis.score;

         const details = referenceAnalysis.details;

         // 1) خصم إضافي على المراجع الناقصة
         if (details.incompleteReferencesCount > 0) {
            const incompletePenalty = Math.min(details.incompleteReferencesCount * 0.15, 2);
            score -= incompletePenalty;
         }

         // 2) مكافأة على المصادر القوية (كتب ودوريات)
         if (details.referenceTypes) {
            const bookBonus = Math.min(details.referenceTypes.book * 0.2, 1);
            const journalBonus = Math.min(details.referenceTypes.journal * 0.2, 1);
            score += bookBonus + journalBonus;
         }

         // 3) خصم إذا كانت مواقع الويب تسيطر على المصادر
         if (details.referenceTypes) {
            const web = details.referenceTypes.web || 0;
            const book = details.referenceTypes.book || 0;
            const journal = details.referenceTypes.journal || 0;
            const news = details.referenceTypes.news || 0;

            if (web > (book + journal + news)) {
               score -= 0.5;
            }
         }

         // 4) مكافأة على استخدام استشهادات ويكي بيانات
         if (details.wikidataCitationsCount > 0) {
            const wikidataBonus = Math.min(0.25 * details.wikidataCitationsCount, 1);
            score += wikidataBonus;
         }

         // 5) خصم/مكافأة حسب فئة عدد المراجع
         if (details.referenceCountCategory) {
            switch (details.referenceCountCategory) {
               case 'under10':
                  score -= 2;
                  break;
               case 'between10and20':
                  score -= 1;
                  break;
               case 'between20and50':
                  // لا خصم ولا مكافأة
                  break;
               case 'above50':
                  score += 0.5;
                  break;
            }
         }

         // 6) مكافأة على التنوع اللغوي في المصادر
         if (details.referenceLanguages) {
            const ar = details.referenceLanguages.ar || 0;
            const en = details.referenceLanguages.en || 0;
            const other = details.referenceLanguages.other || 0;

            // إذا كان هناك مصادر بلغتين على الأقل
            const languagesUsed = (ar > 0 ? 1 : 0) + (en > 0 ? 1 : 0) + (other > 0 ? 1 : 0);
            if (languagesUsed >= 2) {
               score += 0.5;
            }
         }

         // التأكد من بقاء النقاط في النطاق المقبول
         return Math.max(0, Math.min(25, score));
      }

      /**
       * حساب نقاط الوسائط مع المعايير المتقدمة
       * @private
       */
      _calculateMediaScore(mediaAnalysis) {
         let score = 0;
         const details = mediaAnalysis.details;

         // 1) النقاط الأساسية بناءً على الصور الإعلامية وصندوق المعلومات (0-7)
         const informativeImages = details.informativeImages || 0;
         const infoboxImages = details.infoboxImages || 0;

         if (informativeImages >= 5) {
            score += 5;
         } else if (informativeImages >= 3) {
            score += 4;
         } else if (informativeImages >= 1) {
            score += 3;
         }

         // مكافأة على صور صندوق المعلومات
         if (infoboxImages > 0) {
            score += 2;
         }

         // 2) مكافأة على الوسائط المتعددة (فيديو أو صوت)
         if ((details.videos || 0) > 0 || (details.audios || 0) > 0) {
            score += 1;
         }

         // 3) مكافأة على كثافة الوسائط المناسبة
         const mediaDensity = parseFloat(details.mediaDensity) || 0;
         const correctedCount = details.articleMediaCountCorrected || 0;

         if (correctedCount > 0) {
            if (mediaDensity >= 0.3 && mediaDensity <= 1.5) {
               score += 1;
            } else if (mediaDensity > 1.5) {
               score += 1.5;
            }
         }

         // 4) خصم على الصور غير الحرة
         if (details.nonFreeImagesCount > 0) {
            const nonFreePenalty = Math.min(details.nonFreeImagesCount * 0.3, 2);
            score -= nonFreePenalty;
         }

         // 5) خصم على جودة النص البديل السيئة
         if (details.badAltTextCount > 0) {
            const altTextPenalty = Math.min(details.badAltTextCount * 0.2, 2);
            score -= altTextPenalty;
         }

         // 6) مكافأة على الأوصاف العربية في كومنز
         const commonsLikely = details.commonsLikelyCount || 0;
         const arabicDescLikely = details.arabicDescriptionLikelyCount || 0;

         if (commonsLikely > 0 && arabicDescLikely >= commonsLikely / 2) {
            score += 0.5;
         }

         // 7) خصم إذا كانت الصور المصفاة (أعلام/أيقونات) أكثر من الصور الإعلامية
         const filteredOut = details.filteredOutImages || 0;
         if (filteredOut > informativeImages) {
            score -= 1;
         }

         // التأكد من بقاء النقاط في النطاق المقبول (0-10)
         return Math.max(0, Math.min(10, score));
      }

      /**
       * إنشاء تقرير نصي للنسخ
       */
      generateTextReport(result) {
         const lines = [
            'نتيجة تحليل جودة المقالة',
            '═══════════════════════════════',
            `المجموع: ${result.total} / 100`,
            `التقييم: ${result.level}`,
            '',
            'التفاصيل:',
            '───────────────────────────────',
            `• البنية: ${result.scores.structure} / 25 (25%)`,
            `• المصادر: ${result.scores.references} / 25 (25%)`,
            `• الصيانة: ${result.scores.maintenance} / 15 (15%)`,
            `• الروابط: ${result.scores.links} / 15 (15%)`,
            `• الوسائط: ${result.scores.media} / 10 (10%)`,
            `• اللغة والأسلوب: ${result.scores.language} / 10 (10%)`,
            '',
            'ملاحظات واقتراحات:',
            '───────────────────────────────'
         ];

         if (result.notes.length > 0) {
            result.notes.forEach((note, i) => {
               lines.push(`${i + 1}. ${note}`);
            });
         } else {
            lines.push('لا توجد ملاحظات كبيرة.');
         }

         return lines.join('\n');
      }

      /**
       * تحديث الأوزان (إن لزم الأمر)
       */
      setWeights(newWeights) {
         this.weights = { ...this.weights, ...newWeights };
      }
   }

   // تصدير
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.ScoringEngine = ScoringEngine;

})(window);
