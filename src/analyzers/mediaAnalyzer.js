/**
 * mediaAnalyzer.js
 * محلل الوسائط المتعددة
 * يقيم جودة واستخدام الصور والوسائط في المقالة
 */

(function(window) {
   'use strict';

   class MediaAnalyzer {
      constructor() {
         this.maxScore = 10;

         // كلمات مفتاحية لتصفية الوسائط غير المفيدة
         this.filterKeywords = [
            'flag', 'Flag', 'علم', 'logo', 'Logo', 'رمز',
            'Icon', 'icon', 'أيقونة', 'Symbol', 'symbol'
         ];

         // كلمات مفتاحية للصور غير الحرة
         this.nonFreeKeywords = [
            'Fair use', 'fair use', 'Fair_use',
            'Non-free', 'non-free', 'Nonfree', 'nonfree',
            'غير حر', 'غير_حر', 'fairuse', 'Fairuse'
         ];

         // أنماط أسماء الملفات العربية
         this.arabicPattern = /[\u0600-\u06FF]/;
      }

      /**
       * تحليل الوسائط في المقالة
       * @param {UnifiedArticleModel} articleModel 
       * @returns {Object}
       */
      analyze(articleModel) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         // 1. تحليل صور صندوق المعلومات
         const infoboxImages = this._countInfoboxImages(articleModel);
         results.details.infoboxImages = infoboxImages;

         // 2. تحليل صور المقالة (محتوى فقط)
         const articleImages = this._countArticleImages(articleModel);
         results.details.articleImages = articleImages.count;
         results.details.decorativeImages = articleImages.decorative;
         results.details.informativeImages = articleImages.informative;

         // 3. كشف الوسائط المتعددة الأخرى
         const multimedia = this._detectMultimedia(articleModel);
         results.details.videos = multimedia.videos;
         results.details.audios = multimedia.audios;

         // 4. كشف الصور بدون نص بديل
         const imagesWithoutAlt = this._findImagesWithoutAlt(articleModel);
         results.details.imagesWithoutAlt = imagesWithoutAlt;

         // 5. كشف صورة البداية المفقودة
         const hasLeadImage = this._hasLeadImage(articleModel);
         results.details.hasLeadImage = hasLeadImage;

         // 6. تصفية الوسائط غير المفيدة (NEW)
         const filtered = this._filterNonInformationalMedia(articleModel);
         results.details.filteredOutImages = filtered.count;
         
         // 7. كشف الصور غير الحرة (NEW)
         const nonFree = this._detectNonFreeImages(articleModel);
         results.details.nonFreeImagesCount = nonFree.count;

         // 8. فحص البيانات الوصفية في كومنز (تقديري) (NEW)
         const commonsCheck = this._checkCommonsMetadata(articleModel);
         results.details.commonsLikelyCount = commonsCheck.commonsLikely;
         results.details.arabicDescriptionLikelyCount = commonsCheck.arabicDescriptionLikely;

         // 9. فحص جودة النص البديل (NEW)
         const altTextQuality = this._checkAltTextQuality(articleModel);
         results.details.badAltTextCount = altTextQuality.count;

         // 10. عد الوسائط المصححة (NEW)
         const correctedCount = this._countCorrectedArticleMedia(articleModel);
         results.details.articleMediaCountCorrected = correctedCount;

         // 11. حساب كثافة الوسائط (NEW)
         const wordCount = articleModel.fullText ? articleModel.fullText.split(/\s+/).length : 0;
         results.details.mediaDensity = wordCount > 0 
            ? ((correctedCount / wordCount) * 100).toFixed(2)
            : 0;

         // 12. أمثلة على المشاكل (NEW)
         results.details.examples = {
            filteredOut: filtered.examples,
            nonFreeImages: nonFree.examples,
            missingImages: commonsCheck.missingExamples,
            noArabicDescription: commonsCheck.noArabicExamples,
            badAltText: altTextQuality.examples
         };

         // 13. حساب النقاط
         results.score = this._calculateScore(results.details, articleModel);

         // 14. إنشاء الملاحظات
         results.notes = this._generateNotes(results.details, articleModel);

         return results;
      }

      /**
       * عد صور صندوق المعلومات
       * @private
       */
      _countInfoboxImages(articleModel) {
         return articleModel.$parsedContent.find(`
            .infobox img,
            .infobox figure img,
            .infobox .mw-halign-center img
         `).length;
      }

      /**
       * عد صور المقالة (باستثناء الصور الزخرفية)
       * @private
       */
      _countArticleImages(articleModel) {
         let informativeCount = 0;
         let decorativeCount = 0;

         articleModel.$articleBody.find('img').each(function() {
            const $img = $(this);
            const width = parseInt($img.attr('width')) || 0;
            const height = parseInt($img.attr('height')) || 0;
            const src = $img.attr('src') || '';

            // استبعاد الأيقونات والأعلام الصغيرة
            const isSmallIcon = width < 60 || height < 60;
            const isFlag = src.includes('Flag_of') || src.includes('علم_');
            const isIcon = src.includes('Icon-') || src.includes('أيقونة');

            if (isSmallIcon || isFlag || isIcon) {
               decorativeCount++;
            } else {
               informativeCount++;
            }
         });

         return {
            count: informativeCount + decorativeCount,
            informative: informativeCount,
            decorative: decorativeCount
         };
      }

      /**
       * كشف الوسائط المتعددة
       * @private
       */
      _detectMultimedia(articleModel) {
         return {
            videos: articleModel.$articleBody.find('video').length,
            audios: articleModel.$articleBody.find('audio').length
         };
      }

      /**
       * إيجاد الصور بدون نص بديل
       * @private
       */
      _findImagesWithoutAlt(articleModel) {
         let count = 0;
         
         articleModel.$articleBody.find('img').each(function() {
            const alt = $(this).attr('alt');
            if (!alt || alt.trim() === '') {
               count++;
            }
         });

         return count;
      }

      /**
       * كشف وجود صورة في بداية المقالة
       * @private
       */
      _hasLeadImage(articleModel) {
         // التحقق من وجود صورة في أول 500 حرف
         const $firstParagraphs = articleModel.$parsedContent.find('p').slice(0, 3);
         const hasImageNearby = $firstParagraphs.find('img').length > 0 || 
                               articleModel.$infobox.find('img').length > 0;
         
         return hasImageNearby;
      }

      /**
       * تصفية الوسائط غير المفيدة (أعلام، أيقونات، شعارات)
       * @private
       */
      _filterNonInformationalMedia(articleModel) {
         const filtered = [];
         const self = this;

         articleModel.$articleBody.find('img').each(function() {
            const $img = $(this);
            const src = $img.attr('src') || '';
            const alt = $img.attr('alt') || '';
            const width = parseInt($img.attr('width')) || 0;
            const filename = src.split('/').pop();

            // فحص الكلمات المفتاحية
            const matchesKeyword = self.filterKeywords.some(keyword => 
               filename.includes(keyword) || alt.includes(keyword) || src.includes(keyword)
            );

            // فحص الحجم
            const tooSmall = width > 0 && width < 60;

            if (matchesKeyword || tooSmall) {
               filtered.push({
                  filename: filename.substring(0, 50),
                  reason: matchesKeyword ? 'كلمة مفتاحية' : 'صغير جداً'
               });
            }
         });

         return {
            count: filtered.length,
            examples: filtered.slice(0, 5)
         };
      }

      /**
       * كشف الصور غير الحرة
       * @private
       */
      _detectNonFreeImages(articleModel) {
         const nonFree = [];
         const self = this;

         articleModel.$articleBody.find('img').each(function() {
            const $img = $(this);
            const src = $img.attr('src') || '';
            const alt = $img.attr('alt') || '';
            const filename = src.split('/').pop();

            // فحص الكلمات المفتاحية للصور غير الحرة
            const isNonFree = self.nonFreeKeywords.some(keyword => 
               filename.includes(keyword) || alt.includes(keyword) || src.includes(keyword)
            );

            if (isNonFree) {
               nonFree.push(filename.substring(0, 60));
            }
         });

         return {
            count: nonFree.length,
            examples: nonFree.slice(0, 5)
         };
      }

      /**
       * فحص البيانات الوصفية في كومنز (تقديري - بدون استدعاء API)
       * @private
       */
      _checkCommonsMetadata(articleModel) {
         let commonsLikely = 0;
         let arabicDescriptionLikely = 0;
         const missingExamples = [];
         const noArabicExamples = [];
         const self = this;

         articleModel.$articleBody.find('img').each(function() {
            const $img = $(this);
            const src = $img.attr('src') || '';
            const alt = $img.attr('alt') || '';
            const filename = src.split('/').pop();

            // تقدير: إذا كان المصدر يحتوي على "commons" أو "upload.wikimedia"
            const likelyFromCommons = src.includes('commons') || 
                                     src.includes('upload.wikimedia.org') ||
                                     filename.startsWith('File:') ||
                                     /\.(jpg|png|svg|jpeg|gif)$/i.test(filename);

            if (likelyFromCommons) {
               commonsLikely++;

               // تقدير: إذا كان اسم الملف أو النص البديل يحتوي على عربية
               if (self.arabicPattern.test(filename) || self.arabicPattern.test(alt)) {
                  arabicDescriptionLikely++;
               } else {
                  noArabicExamples.push(filename.substring(0, 50));
               }
            } else {
               missingExamples.push(filename.substring(0, 50));
            }
         });

         return {
            commonsLikely: commonsLikely,
            arabicDescriptionLikely: arabicDescriptionLikely,
            missingExamples: missingExamples.slice(0, 5),
            noArabicExamples: noArabicExamples.slice(0, 5)
         };
      }

      /**
       * فحص جودة النص البديل
       * @private
       */
      _checkAltTextQuality(articleModel) {
         const badAlt = [];

         articleModel.$articleBody.find('img').each(function() {
            const $img = $(this);
            const alt = $img.attr('alt') || '';
            const src = $img.attr('src') || '';
            const filename = src.split('/').pop();

            // نص بديل مفقود أو قصير جداً (أقل من 5 أحرف)
            if (!alt || alt.trim().length < 5) {
               badAlt.push({
                  filename: filename.substring(0, 40),
                  alt: alt || '(مفقود)',
                  issue: alt ? 'قصير جداً' : 'مفقود'
               });
            }
         });

         return {
            count: badAlt.length,
            examples: badAlt.slice(0, 5)
         };
      }

      /**
       * عد الوسائط المصححة (استثناء القوالب والهوامش)
       * @private
       */
      _countCorrectedArticleMedia(articleModel) {
         let count = 0;
         const self = this;

         // استنساخ المحتوى وإزالة العناصر غير المرغوبة
         const $content = articleModel.$parsedContent.clone();
         
         // إزالة: صندوق المعلومات، القوالب، الهوامش، الشريط الجانبي
         $content.find('.infobox, .navbox, .sidebar, .mbox, .reflist, .references').remove();

         // عد الصور المتبقية
         $content.find('img').each(function() {
            const $img = $(this);
            const src = $img.attr('src') || '';
            const width = parseInt($img.attr('width')) || 0;
            const filename = src.split('/').pop();

            // استبعاد الأيقونات والأعلام
            const isFiltered = self.filterKeywords.some(keyword => 
               filename.includes(keyword) || src.includes(keyword)
            );
            const tooSmall = width > 0 && width < 60;

            if (!isFiltered && !tooSmall) {
               count++;
            }
         });

         return count;
      }

      /**
       * حساب النقاط
       * @private
       */
      _calculateScore(details, articleModel) {
         let score = 0;

         // صور المقالة (0-6)
         if (details.informativeImages >= 5) score += 6;
         else if (details.informativeImages >= 3) score += 5;
         else if (details.informativeImages >= 2) score += 4;
         else if (details.informativeImages >= 1) score += 3;

         // صور صندوق المعلومات (0-2)
         if (details.infoboxImages > 0) score += 2;

         // وسائط متعددة (0-2)
         if (details.videos > 0 || details.audios > 0) score += 2;

         // عقوبة للصور بدون نص بديل
         if (details.imagesWithoutAlt > 0) {
            score -= Math.min(2, details.imagesWithoutAlt * 0.5);
         }

         return Math.max(0, Math.min(this.maxScore, score));
      }

      /**
       * إنشاء الملاحظات
       * @private
       */
      _generateNotes(details, articleModel) {
         const notes = [];

         // لا توجد وسائط
         if (details.articleImages === 0 && details.infoboxImages === 0) {
            notes.push('المقالة لا تحتوي على أي صور. يُستحسن إضافة صور توضيحية من ويكيميديا كومنز.');
         }

         // صور فقط في صندوق المعلومات
         else if (details.articleImages === 0 && details.infoboxImages > 0) {
            notes.push('الصور موجودة فقط في صندوق المعلومات. يُفضل إضافة صور توضيحية في متن المقالة.');
         }

         // قلة الصور للمقالات الطويلة
         else if (articleModel.articleLength > 5000 && details.informativeImages < 3) {
            notes.push('المقالة طويلة لكن تحتوي على صور قليلة. يُفضل إضافة المزيد من الصور التوضيحية.');
         }

         // صور بدون نص بديل
         if (details.imagesWithoutAlt > 0) {
            notes.push(`${details.imagesWithoutAlt} صورة بدون نص بديل (alt text). يجب إضافة وصف لجميع الصور لتحسين إمكانية الوصول.`);
         }

         // نسبة الصور الزخرفية عالية
         if (details.decorativeImages > details.informativeImages && details.informativeImages > 0) {
            notes.push('عدد الصور الزخرفية (أيقونات وأعلام) أكثر من الصور التوضيحية. يُفضل التركيز على الصور المفيدة.');
         }

         // صور غير حرة (NEW)
         if (details.nonFreeImagesCount > 0) {
            notes.push(`تم اكتشاف ${details.nonFreeImagesCount} صورة غير حرة. يُفضل استبدالها بصور حرة من ويكيميديا كومنز.`);
         }

         // نص بديل سيئ (NEW)
         if (details.badAltTextCount > 0) {
            notes.push(`${details.badAltTextCount} صورة بنص بديل مفقود أو قصير جداً. يجب تحسين النصوص البديلة لإمكانية الوصول.`);
         }

         // صور بدون وصف عربي محتمل (NEW)
         if (details.commonsLikelyCount > 0 && details.arabicDescriptionLikelyCount < details.commonsLikelyCount / 2) {
            notes.push('معظم الصور تفتقر إلى وصف عربي. يُنصح بإضافة أوصاف عربية في ويكيميديا كومنز.');
         }

         // كثافة وسائط منخفضة (NEW)
         if (details.mediaDensity < 0.5 && articleModel.articleLength > 3000) {
            notes.push(`كثافة الوسائط منخفضة (${details.mediaDensity}%). يُفضل إضافة المزيد من الوسائط التوضيحية.`);
         }

         return notes;
      }
   }

   // تصدير
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.MediaAnalyzer = MediaAnalyzer;

})(window);
