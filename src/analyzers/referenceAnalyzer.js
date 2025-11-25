/**
 * referenceAnalyzer.js
 * محلل المراجع والمصادر
 * يقيم جودة وموثوقية المصادر المستخدمة
 */

(function(window) {
   'use strict';

   class ReferenceAnalyzer {
      constructor() {
         this.maxScore = 25;

         // أنواع المراجع المدعومة
         this.referenceTypePatterns = {
            book: [
               /\{\{\s*استشهاد\s+بكتاب/gi,
               /\{\{\s*cite\s+book/gi,
               /ISBN[\s:-]*\d{9,13}/gi
            ],
            journal: [
               /\{\{\s*استشهاد\s+بدورية/gi,
               /\{\{\s*استشهاد\s+بمجلة/gi,
               /\{\{\s*cite\s+journal/gi,
               /DOI\s*[:=]\s*10\.\d+/gi,
               /ISSN[\s:-]*\d{4}-?\d{3}[\dXx]/gi
            ],
            news: [
               /\{\{\s*استشهاد\s+بخبر/gi,
               /\{\{\s*cite\s+news/gi,
               /bbc\.com|cnn\.com|reuters\.com|aljazeera\.|france24\.|dw\.com/gi
            ],
            web: [
               /\{\{\s*استشهاد\s+ويب/gi,
               /\{\{\s*cite\s+web/gi
            ],
            archive: [
               /\{\{\s*استشهاد\s+أرشيف/gi,
               /\{\{\s*استشهاد\s+أرشيف\s+الإنترنت/gi,
               /archive\.org|web\.archive\.org/gi
            ],
            wikidata: [
               /\{\{\s*استشهاد\s+بويكي\s+بيانات/gi,
               /\{\{\s*cite\s+Q\d+/gi
            ]
         };

         // نطاقات اللغات
         this.languageTLDs = {
            ar: ['.sa', '.eg', '.ae', '.sy', '.jo', '.iq', '.kw', '.qa', '.bh', '.om', '.ye', '.lb', '.ps', '.ma', '.tn', '.dz', '.ly', '.sd', '.mr'],
            en: ['.uk', '.us', '.au', '.nz', '.ca', '.ie'],
            fr: ['.fr', '.be', '.ch'],
            de: ['.de', '.at'],
            es: ['.es', '.mx', '.ar', '.co', '.cl', '.pe'],
            other: []
         };

         // ناشرون عرب معروفون
         this.arabicPublishers = [
            'الجزيرة', 'العربية', 'bbc عربي', 'سكاي نيوز عربية',
            'الشرق الأوسط', 'الأهرام', 'اليوم السابع', 'الحياة',
            'العرب', 'الخليج', 'البيان', 'الاتحاد', 'الرياض'
         ];

         // ناشرون إنجليز معروفون
         this.englishPublishers = [
            'BBC', 'CNN', 'Reuters', 'Guardian', 'Telegraph',
            'Times', 'Washington Post', 'New York Times',
            'Nature', 'Science', 'Britannica'
         ];
      }

      /**
       * تحليل المراجع
       * @param {UnifiedArticleModel} articleModel 
       * @returns {Object}
       */
      analyze(articleModel) {
         const results = {
            score: 0,
            details: {},
            notes: []
         };

         // 1. عد المراجع
         const refCounts = this._countReferences(articleModel);
         results.details.totalRefs = refCounts.total;
         results.details.namedRefs = refCounts.named;
         results.details.repeatedRefs = refCounts.repeated;

         // 2. كشف الروابط العارية
         const bareUrls = this._detectBareUrls(articleModel);
         results.details.bareUrls = bareUrls;

         // 3. تحليل جودة قوالب الاستشهاد
         const citationQuality = this._analyzeCitationTemplates(articleModel);
         results.details.incompleteCitations = citationQuality.incomplete;
         results.details.completeCitations = citationQuality.complete;

         // 4. استخراج سنوات النشر
         const publicationYears = this._extractPublicationYears(articleModel);
         results.details.recentYears = publicationYears.recent;
         results.details.allYears = publicationYears.all;

         // 5. كشف قسم المراجع
         const hasRefSection = this._hasReferencesSection(articleModel);
         results.details.hasReferencesSection = hasRefSection;

         // 6. تقييم موثوقية المصادر
         const reliability = this._assessSourceReliability(articleModel);
         results.details.reliableSourcesCount = reliability.count;

         // 7. تصنيف أنواع المراجع (جديد)
         const referenceTypes = this._classifyReferenceTypes(articleModel);
         results.details.referenceTypes = referenceTypes;

         // 8. كشف لغات المراجع (جديد)
         const referenceLanguages = this._detectReferenceLanguages(articleModel);
         results.details.referenceLanguages = referenceLanguages;

         // 9. تصنيف عدد المراجع (جديد)
         const refCountCategory = this._categorizeReferenceCount(refCounts.total);
         results.details.referenceCountCategory = refCountCategory;

         // 10. كشف استشهادات ويكي بيانات (جديد)
         const wikidataCitations = this._detectWikidataCitations(articleModel);
         results.details.wikidataCitationsCount = wikidataCitations;

         // 11. كشف المراجع الناقصة (جديد)
         const incompleteRefs = this._detectIncompleteReferences(articleModel);
         results.details.incompleteReferencesCount = incompleteRefs.count;
         results.details.incompleteReferences = incompleteRefs.examples;

         // 12. حساب النقاط
         results.score = this._calculateScore(results.details, articleModel);

         // 13. إنشاء الملاحظات
         results.notes = this._generateNotes(results.details, articleModel);

         return results;
      }

      /**
       * عد المراجع بدقة
       * @private
       */
      _countReferences(articleModel) {
         const html = articleModel.html;

         // عد <ref> العادية
         const refMatches = html.match(/<ref[\s>]/gi);
         const totalRefs = refMatches ? refMatches.length : 0;

         // عد المراجع المسماة
         const namedRefs = (html.match(/<ref\s+name\s*=\s*["'][^"']+["']/gi) || []).length;

         // عد المراجع المكررة
         const repeatedRefs = (html.match(/<ref\s+name\s*=\s*["'][^"']+["']\s*\/>/gi) || []).length;

         // عد من قائمة المراجع المرئية
         const refsList = articleModel.$referencesSection.find('li').length;

         return {
            total: Math.max(totalRefs, refsList),
            named: namedRefs,
            repeated: repeatedRefs
         };
      }

      /**
       * كشف الروابط العارية
       * @private
       */
      _detectBareUrls(articleModel) {
         let html = articleModel.html;

         // إزالة جميع هياكل الاستشهاد
         html = html
            .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
            .replace(/<ref[^>]*\/>/gi, '')
            .replace(/\{\{\s*[Rr]eflist[^}]*\}\}/g, '')
            .replace(/\{\{\s*[Mm]راجع[^}]*\}\}/g, '')
            .replace(/<references\s*\/?>/gi, '')
            .replace(/\{\{\s*[Cc]ite[^}]*\}\}/g, '')
            .replace(/\{\{\s*استشهاد[^}]*\}\}/g, '')
            .replace(/\{\{\s*[Ww]eb\s+citation[^}]*\}\}/g, '');

         // إزالة الروابط من infobox و navbox
         const $tempContent = articleModel.$parsedContent.clone();
         $tempContent.find('.infobox, .navbox, .sidebar, .metadata').remove();
         
         const cleanHtml = $tempContent.html() || '';
         const bareUrlMatches = cleanHtml.match(/https?:\/\/[^\s<\]"']+/gi);
         
         return bareUrlMatches ? bareUrlMatches.length : 0;
      }

      /**
       * تحليل جودة قوالب الاستشهاد
       * @private
       */
      _analyzeCitationTemplates(articleModel) {
         const html = articleModel.html;
         
         // البحث عن قوالب الاستشهاد
         const citePattern = /\{\{\s*(cite|استشهاد)\s+([^}]+)\}\}/gi;
         const citations = html.match(citePattern) || [];

         let complete = 0;
         let incomplete = 0;

         citations.forEach(cite => {
            // فحص وجود معاملات أساسية
            const hasTitle = /title\s*=|عنوان\s*=/i.test(cite);
            const hasAuthor = /author\s*=|مؤلف\s*=|last\s*=|الأخير\s*=/i.test(cite);
            const hasDate = /date\s*=|تاريخ\s*=|year\s*=|سنة\s*=/i.test(cite);
            const hasUrl = /url\s*=|مسار\s*=/i.test(cite);

            const essentialCount = [hasTitle, hasAuthor, hasDate].filter(Boolean).length;
            
            if (essentialCount >= 2) {
               complete++;
            } else {
               incomplete++;
            }
         });

         return { complete, incomplete };
      }

      /**
       * استخراج سنوات النشر (وليس الوصول/الأرشفة)
       * @private
       */
      _extractPublicationYears(articleModel) {
         const html = articleModel.html;
         const text = articleModel.fullText;

         // البحث عن سنوات النشر في قوالب الاستشهاد
         const pubYearPattern = /(year|سنة|date|تاريخ)\s*=\s*(\d{4})/gi;
         const matches = html.match(pubYearPattern) || [];
         
         const years = matches
            .map(match => {
               const yearMatch = match.match(/\d{4}/);
               return yearMatch ? parseInt(yearMatch[0]) : null;
            })
            .filter(year => year && year >= 1900 && year <= 2025);

         // عد السنوات الحديثة (2015-2025)
         const recentYears = years.filter(year => year >= 2015).length;

         return {
            all: years.length,
            recent: recentYears
         };
      }

      /**
       * كشف قسم المراجع
       * @private
       */
      _hasReferencesSection(articleModel) {
         return articleModel.sections.some(s => 
            /مراجع|references|مصادر|ملاحظات|الهوامش/i.test(s.line)
         );
      }

      /**
       * تقييم موثوقية المصادر
       * @private
       */
      _assessSourceReliability(articleModel) {
         const html = articleModel.html;
         
         // مصادر موثوقة معروفة
         const reliableDomains = [
            'britannica.com',
            'nature.com',
            'science.org',
            'nejm.org',
            'who.int',
            'archive.org',
            'jstor.org',
            'springer.com',
            'cambridge.org',
            'oxford',
            'bbc.com',
            'aljazeera.net'
         ];

         let reliableCount = 0;
         reliableDomains.forEach(domain => {
            const regex = new RegExp(domain.replace('.', '\\.'), 'gi');
            const matches = html.match(regex);
            if (matches) {
               reliableCount += matches.length;
            }
         });

         return { count: reliableCount };
      }

      /**
       * حساب النقاط
       * @private
       */
      _calculateScore(details, articleModel) {
         let score = 0;

         // عدد المراجع (0-15)
         if (details.totalRefs === 0) {
            score += 0;
         } else if (details.totalRefs === 1) {
            score += 3;
         } else if (details.totalRefs <= 3) {
            score += 7;
         } else if (details.totalRefs <= 7) {
            score += 11;
         } else if (details.totalRefs <= 15) {
            score += 14;
         } else {
            score += 15;
         }

         // جودة الاستشهادات (0-4)
         const totalCitations = details.completeCitations + details.incompleteCitations;
         if (totalCitations > 0) {
            const qualityRatio = details.completeCitations / totalCitations;
            if (qualityRatio >= 0.8) score += 4;
            else if (qualityRatio >= 0.6) score += 3;
            else if (qualityRatio >= 0.4) score += 2;
            else score += 1;
         }

         // حداثة المصادر (0-3)
         if (details.recentYears >= 5) score += 3;
         else if (details.recentYears >= 3) score += 2;
         else if (details.recentYears >= 1) score += 1;

         // موثوقية المصادر (0-3)
         if (details.reliableSourcesCount >= 5) score += 3;
         else if (details.reliableSourcesCount >= 2) score += 2;
         else if (details.reliableSourcesCount >= 1) score += 1;

         // عقوبات
         if (details.bareUrls > 0) {
            score -= Math.min(6, details.bareUrls * 2);
         }

         if (!details.hasReferencesSection && details.totalRefs > 0) {
            score -= 2;
         }

         return Math.max(0, Math.min(this.maxScore, score));
      }

      /**
       * تصنيف أنواع المراجع
       * @private
       */
      _classifyReferenceTypes(articleModel) {
         const html = articleModel.html;
         const types = {
            book: 0,
            journal: 0,
            news: 0,
            web: 0,
            archive: 0,
            wikidata: 0,
            unknown: 0
         };

         // كشف كل نوع
         Object.keys(this.referenceTypePatterns).forEach(type => {
            this.referenceTypePatterns[type].forEach(pattern => {
               const matches = html.match(pattern);
               if (matches) {
                  types[type] += matches.length;
               }
            });
         });

         // حساب Unknown (المراجع التي لم يتم تصنيفها)
         const refCounts = this._countReferences(articleModel);
         const classifiedTotal = Object.keys(types).reduce((sum, key) => {
            return key !== 'unknown' ? sum + types[key] : sum;
         }, 0);
         types.unknown = Math.max(0, refCounts.total - classifiedTotal);

         return types;
      }

      /**
       * كشف لغات المراجع
       * @private
       */
      _detectReferenceLanguages(articleModel) {
         const html = articleModel.html;
         const languages = {
            ar: 0,
            en: 0,
            other: 0
         };

         // البحث عن حقل اللغة في القوالب
         const langFieldPattern = /[|]?\s*(language|لغة)\s*=\s*([a-zA-Z\s]+)/gi;
         let match;
         while ((match = langFieldPattern.exec(html)) !== null) {
            const lang = match[2].toLowerCase().trim();
            if (/arabic|عربي|ar/.test(lang)) {
               languages.ar++;
            } else if (/english|إنجليزي|en/.test(lang)) {
               languages.en++;
            } else {
               languages.other++;
            }
         }

         // كشف من خلال الناشر
         this.arabicPublishers.forEach(publisher => {
            const regex = new RegExp(publisher, 'gi');
            const matches = html.match(regex);
            if (matches) {
               languages.ar += matches.length;
            }
         });

         this.englishPublishers.forEach(publisher => {
            const regex = new RegExp(publisher, 'gi');
            const matches = html.match(regex);
            if (matches) {
               languages.en += matches.length;
            }
         });

         // كشف من خلال TLD
         const urlPattern = /https?:\/\/[^\s<\]"']+/gi;
         const urls = html.match(urlPattern) || [];
         
         urls.forEach(url => {
            let classified = false;
            
            // فحص TLD العربي
            for (const tld of this.languageTLDs.ar) {
               if (url.includes(tld)) {
                  languages.ar++;
                  classified = true;
                  break;
               }
            }
            
            if (!classified) {
               // فحص TLD الإنجليزي
               for (const tld of this.languageTLDs.en) {
                  if (url.includes(tld)) {
                     languages.en++;
                     classified = true;
                     break;
                  }
               }
            }
            
            if (!classified) {
               // فحص TLDs أخرى
               for (const lang in this.languageTLDs) {
                  if (lang !== 'ar' && lang !== 'en') {
                     for (const tld of this.languageTLDs[lang]) {
                        if (url.includes(tld)) {
                           languages.other++;
                           classified = true;
                           break;
                        }
                     }
                     if (classified) break;
                  }
               }
            }
         });

         return languages;
      }

      /**
       * تصنيف عدد المراجع
       * @private
       */
      _categorizeReferenceCount(totalRefs) {
         if (totalRefs < 10) {
            return 'under10';
         } else if (totalRefs >= 10 && totalRefs <= 20) {
            return 'between10and20';
         } else if (totalRefs > 20 && totalRefs <= 50) {
            return 'between20and50';
         } else {
            return 'above50';
         }
      }

      /**
       * كشف استشهادات ويكي بيانات
       * @private
       */
      _detectWikidataCitations(articleModel) {
         const html = articleModel.html;
         let count = 0;

         // استشهاد بويكي بيانات
         const wikidataPattern1 = /\{\{\s*استشهاد\s+بويكي\s+بيانات/gi;
         const matches1 = html.match(wikidataPattern1);
         if (matches1) count += matches1.length;

         // Cite Q
         const wikidataPattern2 = /\{\{\s*cite\s+Q\d+/gi;
         const matches2 = html.match(wikidataPattern2);
         if (matches2) count += matches2.length;

         return count;
      }

      /**
       * كشف المراجع الناقصة
       * @private
       */
      _detectIncompleteReferences(articleModel) {
         const html = articleModel.html;
         
         // البحث عن قوالب الاستشهاد
         const citePattern = /\{\{\s*(cite|استشهاد)\s+([^}]+)\}\}/gi;
         const citations = [];
         let match;
         
         while ((match = citePattern.exec(html)) !== null) {
            citations.push(match[0]);
         }

         const incompleteExamples = [];
         let incompleteCount = 0;

         citations.forEach(cite => {
            // فحص الحقول الأساسية
            const hasTitle = /[|]?\s*(title|عنوان)\s*=/i.test(cite);
            const hasPublisher = /[|]?\s*(publisher|ناشر|work|عمل)\s*=/i.test(cite);
            const hasDate = /[|]?\s*(date|تاريخ|year|سنة)\s*=/i.test(cite);
            const hasUrl = /[|]?\s*(url|مسار)\s*=/i.test(cite);

            // اعتبار المرجع ناقصاً إذا فقد 2 أو أكثر من الحقول الأساسية
            const missingFields = [];
            if (!hasTitle) missingFields.push('العنوان');
            if (!hasPublisher) missingFields.push('الناشر');
            if (!hasDate) missingFields.push('التاريخ');
            if (!hasUrl) missingFields.push('الرابط');

            if (missingFields.length >= 2) {
               incompleteCount++;
               
               if (incompleteExamples.length < 3) {
                  // استخراج نوع الاستشهاد
                  const typeMatch = cite.match(/\{\{\s*(cite|استشهاد)\s+(\w+)/i);
                  const type = typeMatch ? typeMatch[2] : 'unknown';
                  
                  incompleteExamples.push({
                     type: type,
                     missing: missingFields,
                     snippet: cite.substring(0, 80) + '...'
                  });
               }
            }
         });

         return {
            count: incompleteCount,
            examples: incompleteExamples
         };
      }

      /**
       * إنشاء الملاحظات
       * @private
       */
      _generateNotes(details, articleModel) {
         const notes = [];

         if (details.totalRefs === 0) {
            notes.push('⚠️ المقالة بدون مراجع. يجب إضافة مصادر موثوقة لدعم المحتوى.');
         } else if (details.totalRefs < 3) {
            notes.push('عدد المراجع قليل جدًا. يُفضل إضافة مزيد من المصادر الموثوقة.');
         } else if (details.totalRefs < 7) {
            notes.push('عدد المراجع مقبول، لكن يمكن تحسينه بإضافة مصادر إضافية.');
         }

         if (details.bareUrls > 0) {
            notes.push(`🔗 ${details.bareUrls} رابط خارجي عاري (بدون تنسيق). يُفضل تحويلها إلى استشهادات كاملة.`);
         }

         if (details.incompleteCitations > 0) {
            notes.push(`📋 ${details.incompleteCitations} قالب استشهاد ناقص. يُستحسن إكمال المعلومات الأساسية (عنوان، مؤلف، تاريخ).`);
         }

         if (!details.hasReferencesSection && details.totalRefs > 0) {
            notes.push('يُفضل إنشاء قسم مستقل للمراجع باسم "مراجع" أو "مصادر".');
         }

         if (details.recentYears === 0 && details.totalRefs > 0) {
            notes.push('لا توجد مصادر حديثة (2015-2025). يُفضل تحديث المصادر إن أمكن.');
         }

         return notes;
      }
   }

   // تصدير
   window.QualityUltraMax = window.QualityUltraMax || {};
   window.QualityUltraMax.ReferenceAnalyzer = ReferenceAnalyzer;

})(window);
