/**
 * panelRenderer.js
 * واجهة المستخدم الرئيسية - عرض لوحة النتائج
 */

(function(window) {
   'use strict';

   class PanelRenderer {
      constructor() {
         this.panelId = 'qum-analysis-panel';
         this.overlayId = 'qum-overlay';
      }

      /**
       * عرض لوحة النتائج
       * @param {Object} result 
       */
      render(result) {
         this._removeExisting();
         this._injectStyles();
         
         const $overlay = this._createOverlay();
         const $panel = this._createPanel(result);
        
         // Overlay should cover the viewport (append to body)
         $('body').append($overlay);

         // Prefer injecting the visible panel into `.mw-parser-output` so it's inside article content
         const $container = $('.mw-parser-output').first();
         if ($container.length) {
            // place panel at top of article content so it's visible and non-obtrusive
            $container.prepend($panel);
         } else {
            $('body').append($panel);
         }
         
         this._attachEvents($overlay, $panel, result);
         
         // تطبيق الوضع الداكن إن كان مفعلًا
         if (this._isDarkModeEnabled()) {
            $panel.addClass('qum-dark-mode');
         }
      }

      /**
       * إزالة اللوحة الموجودة
       * @private
       */
      _removeExisting() {
         $(`#${this.panelId}, #${this.overlayId}`).remove();
      }

      /**
       * إنشاء الطبقة الشفافة
       * @private
       */
      _createOverlay() {
         return $('<div>')
            .attr('id', this.overlayId)
            .addClass('qum-overlay');
      }

      /**
       * إنشاء اللوحة الرئيسية
       * @private
       */
      _createPanel(result) {
         const $panel = $('<div>')
            .attr('id', this.panelId)
            .addClass('qum-panel');

         // العنوان والأزرار
         const $header = this._createHeader(result);
         $panel.append($header);

         // النتيجة الإجمالية
         const $summary = this._createSummary(result);
         $panel.append($summary);

         // جدول النتائج
         const $scoresTable = this._createScoresTable(result);
         $panel.append($scoresTable);

         // الملاحظات
         const $notes = this._createNotes(result);
         $panel.append($notes);

         return $panel;
      }

      /**
       * إنشاء العنوان
       * @private
       */
      _createHeader(result) {
         const $header = $('<div>').addClass('qum-header');
         
         $header.append('<h2>📊 لوحة تحليل جودة المقالة</h2>');
         
         const $buttons = $('<div>').addClass('qum-buttons');
         $buttons.append('<button id="qum-dark-toggle" title="تبديل الوضع الداكن">🌓</button>');
         $buttons.append('<button id="qum-copy" title="نسخ التقرير">📋</button>');
         $buttons.append('<button id="qum-close" title="إغلاق">×</button>');
         
         $header.append($buttons);
         
         return $header;
      }

      /**
       * إنشاء ملخص النتيجة
       * @private
       */
      _createSummary(result) {
         const $summary = $('<div>')
            .addClass('qum-summary')
            .addClass(`qum-${result.levelClass}`);
         
         $summary.append(`<h3>${result.level} — المجموع ${result.total} / 100</h3>`);
         
         // شريط التقدم
         const $progressBar = $('<div>').addClass('qum-progress-container');
         const $progress = $('<div>')
            .addClass('qum-progress')
            .css('width', `${result.total}%`);
         $progressBar.append($progress);
         $summary.append($progressBar);
         
         return $summary;
      }

      /**
       * إنشاء جدول النقاط
       * @private
       */
      _createScoresTable(result) {
         const $table = $('<table>').addClass('qum-table');
         
         // العنوان
         const $thead = $('<thead>');
         $thead.append(`
            <tr>
               <th>المحور</th>
               <th>النقاط</th>
               <th>التفاصيل</th>
            </tr>
         `);
         $table.append($thead);
         
         // المحتوى
         const $tbody = $('<tbody>');
         
         // البنية
         $tbody.append(this._createScoreRow(
            '🏗️ البنية',
            result.scores.structure,
            25,
            this._getStructureDetails(result.details.structure)
         ));
         
         // المراجع
         $tbody.append(this._createScoreRow(
            '📚 المصادر',
            result.scores.references,
            25,
            this._getReferencesDetails(result.details.references)
         ));
         
         // الصيانة
         $tbody.append(this._createScoreRow(
            '🧹 الصيانة',
            result.scores.maintenance,
            15,
            this._getMaintenanceDetails(result.details.maintenance)
         ));
         
         // الروابط
         $tbody.append(this._createScoreRow(
            '🔗 الروابط',
            result.scores.links,
            15,
            this._getLinksDetails(result.details.links)
         ));
         
         // الوسائط
         $tbody.append(this._createScoreRow(
            '🖼️ الوسائط',
            result.scores.media,
            10,
            this._getMediaDetails(result.details.media)
         ));
         
         // التحليل اللغوي
         if (result.details.language) {
            $tbody.append(this._createScoreRow(
               '✍️ اللغة والأسلوب',
               result.scores.language,
               10,
               this._getLanguageDetails(result.details.language)
            ));
         }
         
         // استقرار المقالة والمراجعات
         if (result.details.revision) {
            $tbody.append(this._createScoreRow(
               '⚖️ استقرار المقالة',
               result.details.revision.details.stabilityScore || 0,
               10,
               this._getRevisionDetails(result.details.revision)
            ));
         }
         
         // تكامل ويكي بيانات والمشاريع الشقيقة
         if (result.details.wikidataIntegration) {
            $tbody.append(this._createScoreRow(
               '🌐 تكامل ويكي بيانات',
               result.details.wikidataIntegration.details.crossProjectScore || 0,
               10,
               this._getWikidataIntegrationDetails(result.details.wikidataIntegration)
            ));
         }
         
         $table.append($tbody);
         
         return $table;
      }

      /**
       * إنشاء صف في الجدول
       * @private
       */
      _createScoreRow(title, score, maxScore, details) {
         const percentage = ((score / maxScore) * 100).toFixed(0);
         
         return $('<tr>').append([
            $('<td>').text(title),
            $('<td>').html(`<strong>${score}</strong> / ${maxScore}`),
            $('<td>').addClass('qum-details').html(details)
         ]);
      }

      /**
       * تفاصيل البنية
       * @private
       */
      _getStructureDetails(structure) {
         return `
            <strong>المقدمة:</strong> ${structure.intro.length} حرفًا (${structure.intro.percentageOfArticle}%)<br>
            <strong>الأقسام:</strong> H2: ${structure.sections.levelCounts.h2} | H3: ${structure.sections.levelCounts.h3}<br>
            <strong>الأقسام المفقودة:</strong> ${structure.missingSections.length > 0 ? structure.missingSections.join('، ') : 'لا يوجد'}
         `;
      }

      /**
       * تفاصيل المراجع
       * @private
       */
      _getReferencesDetails(refs) {
         let html = `
            <strong>المراجع:</strong> ${refs.totalRefs}<br>
            <strong>مسماة/مكررة:</strong> ${refs.namedRefs} / ${refs.repeatedRefs}<br>
            <strong>روابط عارية:</strong> ${refs.bareUrls}<br>
            <strong>سنوات حديثة:</strong> ${refs.recentYears}
         `;

         // تصنيف عدد المراجع
         if (refs.referenceCountCategory) {
            const categoryLabels = {
               'under10': 'أقل من 10',
               'between10and20': 'بين 10 و 20',
               'between20and50': 'بين 20 و 50',
               'above50': 'أكثر من 50'
            };
            html += `<br><strong>تصنيف عدد المراجع:</strong> ${categoryLabels[refs.referenceCountCategory] || refs.referenceCountCategory}`;
         }

         // أنواع المراجع
         if (refs.referenceTypes) {
            html += '<br><br><strong>أنواع المراجع:</strong><ul style="margin: 5px 0; padding-right: 20px;">';
            html += `<li>الكتب: ${refs.referenceTypes.book}</li>`;
            html += `<li>الدوريات: ${refs.referenceTypes.journal}</li>`;
            html += `<li>الأخبار: ${refs.referenceTypes.news}</li>`;
            html += `<li>الويب: ${refs.referenceTypes.web}</li>`;
            html += `<li>الأرشيف: ${refs.referenceTypes.archive}</li>`;
            html += `<li>ويكي بيانات: ${refs.referenceTypes.wikidata}</li>`;
            html += '</ul>';
         }

         // لغات المصادر
         if (refs.referenceLanguages) {
            html += '<br><strong>لغات المصادر:</strong><ul style="margin: 5px 0; padding-right: 20px;">';
            html += `<li>العربية: ${refs.referenceLanguages.ar}</li>`;
            html += `<li>الإنجليزية: ${refs.referenceLanguages.en}</li>`;
            html += `<li>لغات أخرى: ${refs.referenceLanguages.other}</li>`;
            html += '</ul>';
         }

         // استشهادات ويكي بيانات
         if (refs.wikidataCitationsCount !== undefined) {
            html += `<br><strong>استشهادات ويكي بيانات:</strong> ${refs.wikidataCitationsCount}`;
         }

         // المراجع الناقصة
         if (refs.incompleteReferencesCount !== undefined) {
            html += `<br><strong>مراجع ناقصة:</strong> ${refs.incompleteReferencesCount}`;
            
            if (refs.incompleteReferences && refs.incompleteReferences.length > 0) {
               html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
               refs.incompleteReferences.slice(0, 3).forEach(ref => {
                  html += '<li>';
                  html += `<strong>النوع:</strong> ${ref.type}<br>`;
                  html += `<strong>الحقول الناقصة:</strong> ${ref.missing.join('، ')}<br>`;
                  html += `<strong>مقتطف:</strong> ${this._escapeHtml(ref.snippet.substring(0, 80))}${ref.snippet.length > 80 ? '...' : ''}`;
                  html += '</li>';
               });
               html += '</ul>';
            }
         }

         return html;
      }

      /**
       * تفاصيل الصيانة
       * @private
       */
      _getMaintenanceDetails(maintenance) {
         return `
            <strong>قوالب صيانة:</strong> ${maintenance.maintenanceTemplates}<br>
            <strong>التصنيفات:</strong> ${maintenance.categories}
         `;
      }

      /**
       * تفاصيل الروابط
       * @private
       */
      _getLinksDetails(links) {
         return `
            <strong>روابط داخلية:</strong> ${links.internalLinks}<br>
            <strong>روابط حمراء:</strong> ${links.redLinks}<br>
            <strong>كثافة:</strong> ${links.linkDensity}%
         `;
      }

      /**
       * تفاصيل الوسائط
       * @private
       */
      _getMediaDetails(media) {
         let html = `
            <strong>صور المقالة:</strong> ${media.articleImages}<br>
            <strong>صور إعلامية:</strong> ${media.informativeImages}<br>
            <strong>صور زخرفية:</strong> ${media.decorativeImages}<br>
            <strong>صور صندوق المعلومات:</strong> ${media.infoboxImages}<br>
            <strong>عدد الوسائط المصحح:</strong> ${media.articleMediaCountCorrected || 0}<br>
            <strong>فيديو/صوت:</strong> ${(media.videos || 0) + (media.audios || 0)}
         `;

         // كثافة الوسائط
         if (media.mediaDensity !== undefined) {
            html += `<br><br><strong>كثافة الوسائط:</strong> ${media.mediaDensity}%`;
         }

         // جودة الوسائط
         html += '<br><br><strong>🔍 جودة الوسائط:</strong><br>';
         html += `• صور غير حرة: ${media.nonFreeImagesCount || 0}<br>`;
         html += `• صور مصفاة (أعلام/أيقونات): ${media.filteredOutImages || 0}<br>`;
         html += `• صور بنص بديل سيئ: ${media.badAltTextCount || 0}<br>`;
         html += `• صور محتملة من كومنز: ${media.commonsLikelyCount || 0}<br>`;
         html += `• صور بوصف عربي محتمل: ${media.arabicDescriptionLikelyCount || 0}`;

         // أمثلة على الصور المصفاة
         if (media.examples && media.examples.filteredOut && media.examples.filteredOut.length > 0) {
            html += '<br><br><strong>أمثلة على الوسائط المصفاة:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            media.examples.filteredOut.forEach(ex => {
               html += `<li>${this._escapeHtml(ex.filename)} - ${ex.reason}</li>`;
            });
            html += '</ul>';
         }

         // أمثلة على الصور غير الحرة
         if (media.examples && media.examples.nonFreeImages && media.examples.nonFreeImages.length > 0) {
            html += '<br><strong>أمثلة على الصور غير الحرة:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            media.examples.nonFreeImages.forEach(ex => {
               html += `<li>${this._escapeHtml(ex)}</li>`;
            });
            html += '</ul>';
         }

         // أمثلة على صور بدون وصف عربي
         if (media.examples && media.examples.noArabicDescription && media.examples.noArabicDescription.length > 0) {
            html += '<br><strong>صور بدون وصف عربي:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            media.examples.noArabicDescription.forEach(ex => {
               html += `<li>${this._escapeHtml(ex)}</li>`;
            });
            html += '</ul>';
         }

         // أمثلة على النص البديل السيئ
         if (media.examples && media.examples.badAltText && media.examples.badAltText.length > 0) {
            html += '<br><strong>أمثلة على النص البديل السيئ:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            media.examples.badAltText.forEach(ex => {
               html += '<li>';
               html += `<strong>الملف:</strong> ${this._escapeHtml(ex.filename)}<br>`;
               html += `<strong>النص البديل:</strong> "${this._escapeHtml(ex.alt)}"<br>`;
               html += `<strong>المشكلة:</strong> ${ex.issue}`;
               html += '</li>';
            });
            html += '</ul>';
         }

         return html;
      }

      /**
       * تفاصيل التحليل اللغوي
       * @private
       */
      _getLanguageDetails(language) {
         let html = `
            <strong>الجمل:</strong> ${language.sentenceCount} (متوسط: ${language.avgSentenceLength} حرف)<br>
            <strong>أنماط ترجمة آلية:</strong> ${language.machineTranslationSignals}<br>
         `;

         // ضعف السرد
         if (language.narrativeWeaknessSignals > 0) {
            html += `<strong>ضعف السرد:</strong> ${language.narrativeWeaknessSignals}`;
            if (language.examples && language.examples.narrativeWeakness && language.examples.narrativeWeakness.length > 0) {
               html += '<ul style="margin:5px 0;padding-right:20px;font-size:11px;">';
               language.examples.narrativeWeakness.slice(0, 3).forEach(ex => {
                  html += `<li>${this._escapeHtml(ex.substring(0, 60))}${ex.length > 60 ? '...' : ''}</li>`;
               });
               html += '</ul>';
            } else {
               html += '<br>';
            }
         }

         // بدايات الجمل بحروف الجر
         if (language.prepositionStartSentences > 0) {
            html += `<strong>جمل تبدأ بحروف جر:</strong> ${language.prepositionStartSentences}`;
            if (language.examples && language.examples.prepositionStartSentences && language.examples.prepositionStartSentences.length > 0) {
               html += '<ul style="margin:5px 0;padding-right:20px;font-size:11px;">';
               language.examples.prepositionStartSentences.slice(0, 3).forEach(ex => {
                  html += `<li>${this._escapeHtml(ex)}</li>`;
               });
               html += '</ul>';
            } else {
               html += '<br>';
            }
         }

         // الجمل المتكررة
         if (language.redundantSentences > 0) {
            html += `<strong>جمل متكررة/متشابهة:</strong> ${language.redundantSentences}`;
            if (language.examples && language.examples.redundantSentences && language.examples.redundantSentences.length > 0) {
               html += '<ul style="margin:5px 0;padding-right:20px;font-size:11px;">';
               language.examples.redundantSentences.slice(0, 3).forEach(ex => {
                  html += `<li>تشابه ${ex.similarity}%: "${this._escapeHtml(ex.s1)}" ≈ "${this._escapeHtml(ex.s2)}"</li>`;
               });
               html += '</ul>';
            } else {
               html += '<br>';
            }
         }

         // الأخطاء النحوية
         html += `<strong>أخطاء نحوية:</strong> ${language.grammarViolations}`;
         if (language.examples && language.examples.grammarRuleHits && language.examples.grammarRuleHits.length > 0) {
            html += '<ul style="margin:5px 0;padding-right:20px;font-size:11px;">';
            language.examples.grammarRuleHits.slice(0, 3).forEach(hit => {
               html += `<li>${this._escapeHtml(hit.name)}: ${hit.count} مرات</li>`;
            });
            html += '</ul>';
         } else {
            html += '<br>';
         }

         // كلمات الحشو
         html += `<strong>كلمات حشو:</strong> ${language.fillerWordsCount}<br>`;

         // درجة الترقيم
         html += `<strong>درجة الترقيم:</strong> ${language.punctuationScore}/100`;

         return html;
      }

      /**
       * تفاصيل استقرار المقالة والمراجعات
       * @private
       */
      _getRevisionDetails(revision) {
         // التحقق من وجود البيانات
         if (!revision || !revision.details) {
            return '<em style="color: #999;">لا تتوفر بيانات كافية عن الاستقرار</em>';
         }

         const details = revision.details;
         let html = '';

         // درجة الاستقرار
         html += `<strong>درجة الاستقرار:</strong> ${details.stabilityScore || 0} / 10<br>`;

         // التعديلات الأخيرة
         html += `<strong>تقدير التعديلات (آخر 90 يوم):</strong> ${details.estimatedEditsLast90Days || 0}<br>`;

         // عدد المحررين
         html += `<strong>تقدير عدد المحررين:</strong> ${details.estimatedUniqueEditors || 0}<br>`;

         // حروب التحرير
         html += `<strong>وجود حروب تحرير:</strong> ${details.hasEditWars ? '⚠️ نعم' : '✅ لا'}<br>`;

         // الحماية
         html += `<strong>حماية الصفحة:</strong> ${details.hasProtection ? '🔒 نعم' : 'لا'}<br>`;

         // إشارات عدم الاستقرار
         html += `<strong>إشارات عدم الاستقرار:</strong> ${details.revisionSignalsCount || 0}`;

         // الأقسام غير المتوازنة
         if (details.largeEditsCount > 0) {
            html += `<br><br><strong>أقسام غير متوازنة:</strong> ${details.largeEditsCount}`;
            if (details.examples && details.examples.largeEdits && details.examples.largeEdits.length > 0) {
               html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
               details.examples.largeEdits.forEach(ex => {
                  html += '<li>';
                  html += `<strong>${this._escapeHtml(ex.section)}</strong><br>`;
                  html += `المشكلة: ${ex.issue} (${ex.length} حرف)`;
                  html += '</li>';
               });
               html += '</ul>';
            }
         }

         // إشارات عدم الاستقرار التفصيلية
         if (details.examples && details.examples.instabilitySignals && details.examples.instabilitySignals.length > 0) {
            html += '<br><strong>تفاصيل إشارات عدم الاستقرار:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            details.examples.instabilitySignals.forEach(signal => {
               html += `<li>${this._escapeHtml(signal)}</li>`;
            });
            html += '</ul>';
         }

         return html;
      }

      /**
       * تفاصيل تكامل ويكي بيانات والمشاريع الشقيقة
       * @private
       */
      _getWikidataIntegrationDetails(integration) {
         // التحقق من وجود البيانات
         if (!integration || !integration.details) {
            return '<em style="color: #999;">لا تتوفر بيانات حول تكامل ويكي بيانات والمشاريع الشقيقة.</em>';
         }

         const details = integration.details;
         let html = '';

         // درجة التكامل
         html += `<strong>درجة التكامل:</strong> ${details.crossProjectScore || 0} / 10<br>`;

         // ربط ويكي بيانات
         html += `<strong>ربط ويكي بيانات:</strong> `;
         if (details.linkedToWikidata) {
            html += '✅ نعم';
            if (details.wikidataItemId) {
               html += ` (${this._escapeHtml(details.wikidataItemId)})`;
            }
         } else {
            html += '❌ لا';
         }
         html += '<br>';

         // استخدام قوالب الوصلات بين اللغوية
         html += `<strong>استخدام قوالب الوصلات بين اللغوية:</strong> `;
         html += details.usesInterwikiTemplate ? '✅ نعم' : '❌ لا';
         html += ` (عدد الوصلات: ${details.interwikiLinksCount || 0})<br>`;

         // صناديق المشاريع الشقيقة
         html += `<strong>صناديق المشاريع الشقيقة:</strong> ${details.sisterProjectBoxesCount || 0}<br>`;

         // إشارات التكامل
         html += `<strong>إشارات التكامل:</strong> ${details.crossProjectSignalsCount || 0}`;

         // أمثلة على الوصلات بين اللغوية
         if (details.examples && details.examples.interwikiLinks && details.examples.interwikiLinks.length > 0) {
            html += '<br><br><strong>أمثلة على الوصلات بين اللغوية:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            details.examples.interwikiLinks.forEach(ex => {
               html += '<li>';
               html += `<strong>${this._escapeHtml(ex.template)}</strong><br>`;
               html += `<code style="font-size: 0.85em;">${this._escapeHtml(ex.snippet)}</code>`;
               html += '</li>';
            });
            html += '</ul>';
         }

         // أمثلة على صناديق المشاريع الشقيقة
         if (details.examples && details.examples.sisterBoxes && details.examples.sisterBoxes.length > 0) {
            html += '<br><strong>أمثلة على صناديق المشاريع:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            details.examples.sisterBoxes.forEach(ex => {
               html += '<li>';
               html += `<strong>${this._escapeHtml(ex.project)}</strong><br>`;
               html += `<code style="font-size: 0.85em;">${this._escapeHtml(ex.snippet)}</code>`;
               html += '</li>';
            });
            html += '</ul>';
         }

         // إشارات ويكي بيانات
         if (details.examples && details.examples.wikidataHints && details.examples.wikidataHints.length > 0) {
            html += '<br><strong>إشارات ويكي بيانات المستخدمة:</strong>';
            html += '<ul style="margin: 5px 0; padding-right: 20px; font-size: 0.9em;">';
            details.examples.wikidataHints.forEach(hint => {
               html += `<li>{{${this._escapeHtml(hint)}}}</li>`;
            });
            html += '</ul>';
         }

         return html;
      }

      /**
       * إنشاء قسم الملاحظات
       * @private
       */
      _createNotes(result) {
         const $notesSection = $('<div>').addClass('qum-notes-section');
         
         $notesSection.append('<h3>💡 ملاحظات واقتراحات تحسين</h3>');
         
         if (result.notes.length > 0) {
            const $list = $('<ul>').addClass('qum-notes-list');
            result.notes.forEach(note => {
               $list.append(`<li>${this._escapeHtml(note)}</li>`);
            });
            $notesSection.append($list);
         } else {
            $notesSection.append('<p>لا توجد ملاحظات كبيرة. المقالة في حالة جيدة.</p>');
         }
         
         return $notesSection;
      }

      /**
       * ربط الأحداث
       * @private
       */
      _attachEvents($overlay, $panel, result) {
         // إغلاق
         $('#qum-close, #' + this.overlayId).on('click', () => {
            this._removeExisting();
         });
         
         // نسخ
         $('#qum-copy').on('click', () => {
            this._copyReport(result);
         });
         
         // الوضع الداكن
         $('#qum-dark-toggle').on('click', () => {
            this._toggleDarkMode($panel);
         });
      }

      /**
       * نسخ التقرير
       * @private
       */
      _copyReport(result) {
         const scoringEngine = new window.QualityUltraMax.ScoringEngine();
         const reportText = scoringEngine.generateTextReport(result);
         
         if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(reportText).then(() => {
               mw.notify('تم نسخ التقرير ✓', { type: 'success' });
            }).catch(() => {
               this._fallbackCopy(reportText);
            });
         } else {
            this._fallbackCopy(reportText);
         }
      }

      /**
       * نسخ احتياطي
       * @private
       */
      _fallbackCopy(text) {
         prompt('انسخ النص التالي:', text);
      }

      /**
       * تبديل الوضع الداكن
       * @private
       */
      _toggleDarkMode($panel) {
         $panel.toggleClass('qum-dark-mode');
         const isDark = $panel.hasClass('qum-dark-mode');
         localStorage.setItem('qum-dark-mode', isDark ? '1' : '0');
      }

      /**
       * فحص الوضع الداكن
       * @private
       */
      _isDarkModeEnabled() {
         return localStorage.getItem('qum-dark-mode') === '1';
      }

      /**
       * تحويل النص إلى HTML آمن
       * @private
       */
      _escapeHtml(str) {
         return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
      }

      /**
       * حقن CSS
       * @private
       */
      _injectStyles() {
         if ($('#qum-styles').length > 0) return;
         
         const css = window.QualityUltraMax.Styles || this._getDefaultStyles();
         $('head').append(`<style id="qum-styles">${css}</style>`);
      }

      /**
       * الأنماط الافتراضية
       * @private
       */
      _getDefaultStyles() {
         return `
            .qum-overlay {
               position: fixed;
               top: 0; left: 0; right: 0; bottom: 0;
               background: rgba(0, 0, 0, 0.5);
               z-index: 9998;
            }
            .qum-panel {
               position: fixed;
               top: 5%; left: 50%;
               transform: translateX(-50%);
               background: #fff;
               border-radius: 12px;
               border: 2px solid #0969da;
               padding: 20px;
               width: 700px;
               max-width: 95%;
               max-height: 85%;
               overflow: auto;
               box-shadow: 0 10px 40px rgba(0,0,0,0.3);
               z-index: 9999;
               direction: rtl;
               font-family: Tahoma, Arial, sans-serif;
            }
            .qum-header {
               display: flex;
               justify-content: space-between;
               align-items: center;
               margin-bottom: 15px;
               padding-bottom: 10px;
               border-bottom: 2px solid #e1e4e8;
            }
            .qum-header h2 {
               margin: 0;
               font-size: 20px;
               color: #24292f;
            }
            .qum-buttons button {
               background: #f6f8fa;
               border: 1px solid #d0d7de;
               border-radius: 6px;
               padding: 6px 10px;
               margin-left: 5px;
               cursor: pointer;
               font-size: 16px;
            }
            .qum-buttons button:hover {
               background: #e1e4e8;
            }
            #qum-close {
               background: #ef4444;
               color: #fff;
               border-color: #dc2626;
               font-weight: bold;
            }
            .qum-summary {
               text-align: center;
               padding: 15px;
               border-radius: 8px;
               margin-bottom: 20px;
            }
            .qum-summary h3 {
               margin: 0 0 10px 0;
               font-size: 18px;
            }
            .qum-featured { background: linear-gradient(135deg, #fef3c7, #fde68a); }
            .qum-good { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
            .qum-advanced { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
            .qum-start { background: linear-gradient(135deg, #fed7aa, #fdba74); }
            .qum-stub { background: linear-gradient(135deg, #fecaca, #fca5a5); }
            .qum-progress-container {
               background: #e5e7eb;
               height: 20px;
               border-radius: 10px;
               overflow: hidden;
            }
            .qum-progress {
               background: linear-gradient(90deg, #3b82f6, #2563eb);
               height: 100%;
               transition: width 0.5s ease;
            }
            .qum-table {
               width: 100%;
               border-collapse: collapse;
               margin-bottom: 20px;
               font-size: 14px;
            }
            .qum-table th, .qum-table td {
               border: 1px solid #d0d7de;
               padding: 10px;
               text-align: right;
            }
            .qum-table th {
               background: #f6f8fa;
               font-weight: bold;
            }
            .qum-table .qum-details {
               font-size: 13px;
               line-height: 1.6;
            }
            .qum-notes-section h3 {
               margin: 10px 0;
               font-size: 16px;
            }
            .qum-notes-list {
               font-size: 14px;
               line-height: 1.8;
               padding-right: 20px;
            }
            .qum-dark-mode {
               background: #1c1c1c;
               color: #e1e4e8;
               border-color: #30363d;
            }
            .qum-dark-mode .qum-header {
               border-bottom-color: #30363d;
            }
            .qum-dark-mode .qum-header h2 {
               color: #e1e4e8;
            }
            .qum-dark-mode .qum-buttons button {
               background: #21262d;
               border-color: #30363d;
               color: #e1e4e8;
            }
            .qum-dark-mode .qum-table th, .qum-dark-mode .qum-table td {
               border-color: #30363d;
            }
            .qum-dark-mode .qum-table th {
               background: #161b22;
            }
         `;
      }
   }

   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.PanelRenderer = PanelRenderer;

})(window);
