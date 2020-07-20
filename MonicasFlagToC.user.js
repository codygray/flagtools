// ==UserScript==
// @name          Monica's Flag ToC
// @description   Implement https://meta.stackexchange.com/questions/305984/suggestions-for-improving-the-moderator-flag-overlay-view/305987#305987
// @author        Shog9
// @namespace     https://github.com/Shog9/flagfilter/
// @version       0.94
// @include       http*://stackoverflow.com/questions/*
// @include       http*://*.stackoverflow.com/questions/*
// @include       http*://dev.stackoverflow.com/questions/*
// @include       http*://askubuntu.com/questions/*
// @include       http*://*.askubuntu.com/questions/*
// @include       http*://superuser.com/questions/*
// @include       http*://*.superuser.com/questions/*
// @include       http*://serverfault.com/questions/*
// @include       http*://*.serverfault.com/questions/*
// @include       http*://mathoverflow.net/questions/*
// @include       http*://*.mathoverflow.net/questions/*
// @include       http*://*.stackexchange.com/questions/*
// @include       http*://local.mse.com/questions/*
// @exclude       http*://chat.*.com/*
// ==/UserScript==

// this serves only to avoid embarassing mistakes caused by inadvertently loading this script onto a page that isn't a Stack Exchange page
let isSEsite = false;
for (const s of document.querySelectorAll("script"))
{
   isSEsite = isSEsite||/StackExchange\.ready\(/.test(s.textContent);
}

// don't bother running this if the user isn't a moderator on the current site
if (!isSEsite || typeof StackExchange === "undefined" || !StackExchange.options.user.isModerator)
{
   return;
}

function with_jquery(f)
{
   const script = document.createElement("script");
   script.type = "text/javascript";
   script.textContent = "if (window.jQuery) (" + f.toString() + ")(window.jQuery)" + "\n\n//# sourceURL=" + encodeURI(GM_info.script.namespace.replace(/\/?$/, "/")) + encodeURIComponent(GM_info.script.name).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16)); // make this easier to debug;
   document.body.appendChild(script);
}

with_jquery(function()
{
   const makeFlagInfoStickyAndFloatAbovePost = true;

   window.FlagFilter = window.FlagFilter || {};

   initStyles();
   initTools();
   initQuestionPage();


function initStyles()
{
   let flagStyles = document.createElement("style");
   flagStyles.textContent = `
   #postflag-bar
   {
      display: none;
      background-color: rgba( 239,240,241, 0.75);
      opacity: 1;
      z-index: 1050; -- rise above left sidebar
   }

   #postflag-bar>div
   {
      display: grid;
   }


   #postflag-bar .flag-summary, .js-post-flag-bar .flag-summary
   {
      display: flex;
      flex: 1 auto;
      flex-direction: column;
      margin-left: 40px;
      margin-right: 40px;
   }

   .flagToC
   {
      list-style-type: none;
      margin: 0;
      padding: 0;
   }

   .flagToC>li
   {
      padding: 4px;
      width:15em;
      float:left;
      box-shadow: 0 0 8px rgba(214,217,220,.7);
      margin: 4px;
      border-radius: 4px;
      background-color: #fff;
   }

   .flagToC>li ul
   {
      margin: 0;
      padding: 0;
   }
   .flagToC>li ul>li::before
   {
      content: attr(data-count);
      color: #6A7E7C;
      padding-right: 1em;
   }
   .flagToC>li ul>li
   {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
   }

   .flagToC>li ul>li.inactive, .flagToC>li ul>li.inactive a
   {
      color: #6A7E7C;
   }

   .mod-tools.mod-tools-post,
   .mod-tools.mod-tools-comment-header
   {
      background-color: var(--orange-050);
   }

   .mod-tools.mod-tools-post
   {
      grid-column: 1 / span 2;
      margin-bottom: 15px;
      padding: 9px 12px 0;
${makeFlagInfoStickyAndFloatAbovePost
?
`     position: sticky;
      top: 0;
      z-index: 1050;
`
:
      ''
}
   }

   .mod-tools.mod-tools-comment-header
   {
      padding: 12px;
      border-bottom: 1px solid var(--black-075);
   }

   .mod-tools.mod-tools-post,
   .mod-tools.mod-tools-comment-header,
   .mod-tools .mod-tools-comment > :first-child
   {
      border-left: 8px solid var(--orange-200);
   }

   .mod-tools.mod-tools-post.active-flag,
   .mod-tools.mod-tools-comment-header.active-flag,
   .mod-tools .mod-tools-comment.active-flag > :first-child
   {
      border-left: 8px solid var(--orange-500);
   }

   .mod-tools.mod-tools-comment-header,
   .mod-tools .mod-tools-comment > :first-child
   {
      /* compensate for border line */
      margin-left: -8px;
   }

   .mod-tools.mod-tools-post h3,
   .mod-tools.mod-tools-comment-header h3
   {
      color: var(--orange-900);
   }

   .mod-tools.mod-tools-post .dismiss-flag-popup-buttons
   {
      float: right;
      margin-left: 9px;
   }

   .mod-tools.mod-tools-post .dismiss-flag-popup-buttons .flag-dismiss-decline
   {
      color: var(--red-600);
   }

   .mod-tools ul.flags
   {
      margin: 0 0 0 10px;
      padding: 0;
   }

   .mod-tools ul.flags li
   {
      list-style: none;
      margin: 10px 0 10px 10px;
   }

   .mod-tools ul.flags li:before,
   .mod-tools ul.flags li:after
   {
      content: ' ';
      display: table;
   }

   .mod-tools ul.flags li:after
   {
      clear: both;
   }

   .mod-tools .flag-outcome
   {
      margin-left: 20px;
   }

   .mod-tools .dismiss-flags-popup .mark-flag-helpful,
   .mod-tools .dismiss-flags-popup .mark-flag-declined
   {
      padding: 6px;
   }

   .mod-tools .dismiss-flags-popup .mark-flag-declined.-btn
   {
      color: var(--red-800);
   }

   .comment .flag-dismiss-comment
   {
      grid-column: 1 / span 2;
      padding-left: 2px;
      text-align: center;
   }

   .mod-tools ul.flags .flag-info
   {
      /* white-space: nowrap; */
   }

   /**/

   /* in which I mangle the site's flexbox styles to work for a purpose they were never intended to serve.
        this is almost certainly a bad idea, but hopefully easier than chasing site styling and beats 9 bold blue buttons in 18 sq.in.
         pretty unlikely a designer will ever see this, so I should be safe
   */
   .dismiss-flags-popup
   {
      padding: 16px 0;
      display: none;
   }
   .dismiss-flags-popup form .g-row>.-btn
   {
      flex: initial;
   }
   .dismiss-flags-popup form>button.g-col
   {
      text-align: left;
   }


   .mod-actions:before,
   .mod-actions:after
   {
      content: ' ';
      display: table;
   }

   .mod-actions:after
   {
      clear: both;
   }

   .mod-actions button
   {
      margin: 0 2px;
   }

   .mod-actions .flag-dispute-spam
   {
      float: right;
   }

   /**/

   .mod-tools ul.flags .flag-info .flag-creation-user
   {
      white-space: nowrap;
   }

   /* fix close button in the flag bar to make the whole thing clickable */

   #postflag-bar .nav-button.close {
      color: unset;
      padding: unset;
      border: unset;
      border-radius: unset;
      background-color: unset;
   }

   #postflag-bar .nav-button.close:hover {
      color: unset;
   }

   #postflag-bar .nav-button.close a {
      background-color: #6a737c;
      border: 1px solid #9fa6ad;
      border-radius: 10px;
      color: white;
      display: block;
      padding: 2px 5px;
   }

   #postflag-bar .nav-button.close a:hover {
      background-color: white;
      color: #9fa6ad;
   }

   /*
     Put comment delete link in consistent place
   */

   .comment, .comment .flags
   {
      clear: both;
   }

   .comment .js-comment-delete
   {
      float: right;
      margin: 0;
      padding: 0;
   }

   .comment .js-comment-delete span
   {
      visibility: visible;
      margin: 0;
      padding: 0;
   }

   @supports (display: grid) and (not (display: contents) )
   {
      ul.comments-list .active-flag .comment-actions
      {
         width: 54px;
      }
   }

   `;

   document.head.appendChild(flagStyles);
}

//
// Generally-useful moderation routines
//
function initTools()
{
   FlagFilter.tools = $.extend({}, FlagFilter.tools,
   {
      // closeReasonId: 'SiteSpecific', 'NeedMoreFocus', 'NeedsDetailsOrClarity', 'OpinionBased', 'Duplicate'
      // if closeReasonId is 'SiteSpecific', offtopicReasonId : 11-norepro, 13-nomcve, 16-toolrec, 3-custom/other, 2-migrate
      closeQuestion: function(postId,
                              closeReasonId,
                              offTopicReasonId,
                              duplicateOfQuestionId = null,
                              belongsOnBaseHostAddress = null,
                              offTopicOtherText = 'I’m voting to close this question because ')
      {
         if (typeof postId === 'undefined' || postId === null) return;
         if (typeof closeReasonId === 'undefined' || closeReasonId === null) return;
         if (closeReasonId === 'SiteSpecific' && (typeof offTopicReasonId === 'undefined' || offTopicReasonId === null)) return;

         if (closeReasonId === 'Duplicate')
         {
            if (duplicateOfQuestionId === null)
            {
               return;
            }
            offTopicReasonId = null;
         }
         if (closeReasonId === 'SiteSpecific' && offTopicReasonId === 2)
         {
            if (belongsOnBaseHostAddress === null)
            {
               return;
            }
         }
         if (offTopicOtherText === null)
         {
            offTopicOtherText = 'I’m voting to close this question because ';
         }

         return $.post(
         {
            url: `/flags/questions/${postId}/close/add`,
            data:
            {
               'fkey': StackExchange.options.user.fkey,
               'closeReasonId': closeReasonId,
               'duplicateOfQuestionId': duplicateOfQuestionId,
               'siteSpecificCloseReasonId': offTopicReasonId,
               'siteSpecificOtherText': offTopicOtherText,
               //'siteSpecificOtherCommentId': '',
               'originalSiteSpecificOtherText': 'I’m voting to close this question because ',
               'belongsOnBaseHostAddress': belongsOnBaseHostAddress
            }
         });
      },

      migrateTo: function(postId, destinationHost)
      {
         return FlagFilter.tools.closeQuestion(postId, 'SiteSpecific', 2, null, destinationHost);
      },

      annotateUser: function(userId, annotation)
      {
         return $.post('/admin/users/' + userId + '/annotate',
            {
               "mod-actions": "annotate",
               annotation: annotation,
               fkey: StackExchange.options.user.fkey
            });
      },

      reviewBanUser: function(userId, days, explanation)
      {
         const params = {
               userId: userId,
               reviewBanDays: days,
               fkey: StackExchange.options.user.fkey
            };
         if (explanation)
         {
            params.explanation = explanation;
         }
         return $.post('/admin/review/ban-user', params);
      },

      // hate safari
      parseISODate: function(isoDate, def)
      {
         const parsed = Date.parse((isoDate||'').replace(' ','T'));
         return parsed ? new Date(parsed) : def;
      },

      formatDate: function(date)
      {
         if ( !date.getTime() ) return "(??)";

         // mostly stolen from SE.com
         const delta = (((new Date()).getTime() - date.getTime()) / 1000);

         if (delta < 2) {
            return 'just now';
         }
         if (delta < 60) {
            return Math.floor(delta) + ' secs ago';
         }
         if (delta < 120) {
            return '1 min ago';
         }
         if (delta < 3600) {
            return Math.floor(delta / 60) + ' mins ago';
         }
         if (delta < 7200) {
            return '1 hour ago';
         }
         if (delta < 86400) {
            return Math.floor(delta / 3600) + ' hours ago';
         }
         if (delta < 172800) {
            return 'yesterday';
         }
         if (delta < 259200) {
            return '2 days ago';
         }
         return date.toLocaleString(undefined, {month: "short", timeZone: "UTC"})
            + ' ' + date.toLocaleString(undefined, {day: "2-digit", timeZone: "UTC"})
            + ( delta > 31536000 ? ' \'' + date.toLocaleString(undefined, {year: "2-digit", timeZone: "UTC"}) : '')
            + ' at'
            + ' ' + date.toLocaleString(undefined, {minute: "2-digit", hour: "2-digit", hour12: false, timeZone: "UTC"});
      },

      formatISODate: function(date)
      {
         return date.toJSON().replace(/\.\d+Z/, 'Z');
      },

      dismissAllCommentFlags: function(commentId, flagIds)
      {
         // although the UI implies it's possible, we can't currently dismiss individual comment flags
        return $.post('/admin/comment/' + commentId+ '/clear-flags', {fkey:StackExchange.options.user.fkey});
      },


      dismissFlag: function(postId, flagIds, helpful, declineId, comment)
      {
         const ticks = StackExchange.moderator.renderTimeTicks||(Date.now()*10000+621355968000000000);
         return $.post('/messages/delete-moderator-messages/' + postId + '/'
            + ticks + '?valid=' + helpful + '&flagIdsSemiColonDelimited=' + (flagIds.join ? flagIds.join(';') : flagIds),
            {comment: comment||declineId||'', fkey:StackExchange.options.user.fkey});
      },

      dismissAllFlags: function(postId, helpful, declineId, comment)
      {
         const ticks = StackExchange.moderator.renderTimeTicks||(Date.now()*10000+621355968000000000);
         return $.post('/messages/delete-moderator-messages/' + postId + '/'
            + ticks+ '?valid=' + helpful,
            {comment: comment||declineId||'', fkey:StackExchange.options.user.fkey});
      },

      disputeSpamAbusiveFlags: function(postId)
      {
         $.post("/admin/posts/" + postId + "/clear-offensive-spam-flags", {fkey: StackExchange.options.user.fkey})
            .then(() => location.reload(),
                     function(err) { console.log(err); alert("something went wrong") });
      },

      moveCommentsToChat: function(postId)
      {
         return $.post('/admin/posts/' + postId + '/move-comments-to-chat', {fkey:StackExchange.options.user.fkey});
      },

      makeWait: function(msecs)
      {
         return function()
         {
            const args = arguments;
            const result = $.Deferred();
            setTimeout(function() { result.resolve.apply(result, args) }, msecs);
            return result.promise();
         }
      },

      flagHelpfulUI: function(uiParent)
      {
         const result = $.Deferred();
         const helpfulForm = $(`
            <div class="dismiss-flags-popup">
               <form class="g-column _gutters">
                  <label class="f-label">Mark flag(s) as helpful because&hellip;</label>
                  <div class="g-col g-row _gutters">
                     <div class="g-col -input">
                         <input type="text" maxlength="200" placeholder="optional feedback (visible to the user)" class="s-input s-input__sm">
                     </div>
                     <div class="g-col -btn">
                       <button class="s-btn s-btn__filled s-btn__primary mark-flag-helpful" type="submit">Submit</button>
                     </div>
                  </div>
                  <span class="text-counter cool">enter nothing at all, or up to 200 characters of cheerful guidance</span>
                </form>
            </div>
         `);

         uiParent.parent().find(".dismiss-flags-popup").remove();
         helpfulForm
            .insertAfter(uiParent)
            .slideDown(250)
            .find("button,input").first().focus();

         helpfulForm.find("input[type=text]").charCounter({min: 0, max: 200, target: helpfulForm.find(".text-counter")});

         helpfulForm.find(".mark-flag-helpful").click(function(ev)
         {
            ev.preventDefault();
            helpfulForm.remove();
            result.resolve({helpful: true, declineId: 0, comment: helpfulForm.find("input[type=text]").val()});
         });

         return result.promise();
      },

      flagDeclineUI: function(uiParent)
      {
         const reasons = {
            technical: {
               id: 1,
               text: "",
               prompt: "flags should not be used to indicate technical inaccuracies, or an altogether wrong answer",
               title: "use when the post does not violate the standards of the site, but is simply misleading or inaccurate",
            },
            noevidence: {
               id: 2,
               text: "",
               prompt: "a moderator reviewed your flag, but found no evidence to support it",
               title: "use when you were unable to find any evidence that the problem described by the flag actually occurred",
            },
            nomods: {
               id: 3,
               text: "",
               prompt: "flags should only be used to make moderators aware of content that requires their intervention",
               title: "use when the problem described could be corrected by the flagger, passers-by, the passage of time, or being less pedantic",
            },
            stdflags: {
               id: 4,
               text: "",
               prompt: "using <b>standard flags</b> helps us prioritize problems and resolve them faster...",
               title: "use when the flagger used a custom flag in a situation where a standard flag would be more appropriate",
            },
            needsedits: {
               id: -1,
               text: "The issue(s) you note with this post can be corrected simply by editing it. Even anonymous users have the ability to suggest edits to posts. This does not require moderator intervention.",
               prompt: "post needs <b>editing, not moderator</b> intervention",
               title: "use when the post needs edits (either by the flagger or someone else), rather than moderator intervention",
            },
            notdupe: {
               id: -2,
               text: "If you disagree that your question is a duplicate, you should edit the question to clarify the difference and why those answers didn't solve your problem. See: https://meta.stackoverflow.com/q/252252",
               prompt: "if you <b>disagree that your question is a duplicate</b>...",
               title: "use when the flag is complaining to a moderator that the question was closed as a duplicate",
            },
            badmigration: {
               id: -3,
               text: "Questions should not be migrated away unless they are clearly (1) off-topic for the site where they were originally asked, (2) on-topic for the proposed target site, (3) of notably high quality.",
               prompt: "this question should <b>not be migrated</b> elsewhere",
               title: "use when the flag is requesting migration of a question that is unsuitable for migration",
            },
            oldmigration: {
               id: -4,
               text: "Questions that are more than 60 days old cannot be migrated to other Stack Exchange sites.",
               prompt: "questions <b>more than 60 days old</b> cannot be migrated",
               title: "use when the flag is requesting migration of a question that is too old (> 60 days) to migrate",
            },
            nodeletion: {
               id: -5,
               text: `We do not routinely delete questions that have received answers, as those answers may prove useful to future viewers. Please see: ${window.location.hostname}/help/what-to-do-instead-of-deleting-question`,
               prompt: "we <b>do not routinely delete</b> questions that have received answers...",
               title: "use when the flagger is requesting deletion of a question with answers that you don't think should be deleted",
            },
            changeaccept: {
               id: -6,
               text: `Moderators cannot set or change the accepted answer. This can only be done by the original asker, and is optional. Please see: ${window.location.hostname}/help/accepted-answer`,
               prompt: "moderators cannot set or change the <b>accepted answer</b>...",
               title: "use when the flagger is requesting that the accepted answer be set/changed",
            },
            downvotewhine: {
               id: -7,
               text: 'Users can vote on posts as they see fit, whether up or down. Moderators do not intervene in legitimate voting. To see common reasons for downvoting, hover over the downvote arrow and read its tooltip.',
               prompt: "Users can <b>vote</b> on posts as they see fit, whether up or down. Moderators do not intervene...",
               title: "use when the flagger is whining about downvotes (and it is not a legitimate flag about vote fraud)",
            },
            notspam: {
               id: -8,
               text: "While this question is of extremely low quality and needs to be closed, it is not spam. Please review the list of flag options that are available to you, and choose a more appropriate flag next time.",
               prompt: "while this question is of extremely low quality and needs to be closed, it is <b>not spam</b>...",
               title: "use when the flagger has raised a spam flag on garbage (recognizes the legitimacy of their concerns, but gently corrects the specific flag choice)",
            },
            nofraud: {
               id: -9,
               text: "Thank you for your flag. A moderator has carefully investigated the situation, but did not find any evidence of suspicious or targeted voting for/against your account.",
               prompt: "<b>no evidence of suspicious or targeted voting</b> was found for/against your account",
               title: "use when the flagger has asked for a targeted/fraudulent voting investigation, but that turned up nothing even remotely justifying a flag",
            },
         };

         const lastDecline = localStorage["flaaaaags.last-decline"];
         if (lastDecline)
         {
            reasons["lastEntered"] = {
               id: 0,
               text: lastDecline,
               prompt: `<b>last reason:</b> ${lastDecline}`,
               title: "re-use the last custom reason that you typed to decline a flag"
            };
         }

         const result = $.Deferred();

         const declineForm = $(`
            <div class="dismiss-flags-popup">
               <form class="g-column _gutters">
                  <label class="f-label">Decline flag(s) because&hellip;</label>
                  <div class="g-col g-row _gutters">
                     <div class="g-col -input">
                         <input type="text" maxlength="200" placeholder="optional feedback (visible to the user)" class="s-input s-input__sm">
                     </div>
                     <div class="g-col -btn">
                       <button class="s-btn s-btn__filled s-btn__danger mark-flag-declined" value="other" type="submit" disabled>Decline</button>
                     </div>
                  </div>
                  <span class="text-counter cool">enter at least 10 characters of righteous indignation</span>
               </form>
            </div>
         `);

         for (const reason in reasons)
         {
            $(`<button class="s-btn s-btn__outlined s-btn__danger g-col -btn mark-flag-declined" type="button">${reasons[reason].prompt}</button>`)
               .attr({value: reason, title: reasons[reason].title})
               .insertAfter(declineForm.find("form>label,form>button:last").last());
         }

         uiParent.parent().find(".dismiss-flags-popup").remove();
         declineForm
            .insertAfter(uiParent)
            .slideDown(250);

         const customDeclineField = declineForm.find("input[type=text]")
            .focus()
            .on("input", function()
            {
               const text = customDeclineField.val();
               declineForm.find(".mark-flag-declined[value=other]").prop("disabled", text.length < 10);
            })
            .charCounter({min: 10, max: 200, target: declineForm.find(".text-counter")})

         declineForm.find(".mark-flag-declined").click(function(ev)
         {
            ev.preventDefault();

            let declineId;
            let declineText;
            if (reasons[this.value])
            {
               declineId = Math.max(reasons[this.value].id, 0);
               declineText = reasons[this.value].text;
            }
            else
            {
               // User typed in a custom reason.
               declineId = 0;
               declineText = customDeclineField.val();
               localStorage["flaaaaags.last-decline"] = declineText;
            }

            declineForm.remove();
            result.resolve({helpful: false, declineId: declineId, comment: declineText});
         });

         return result.promise();
      },

      predictMigrationDest: function(flagText)
      {
         return loadMigrationSites()
            .then(function(sites)
            {
               let ret = { baseHostAddress: '', name: '' };

               if (!/[a-zA-Z]+.stack(exchange|overflow)(.com)?|belongs (on|to)|move|migrat|ask|fit|best|better/i.test(flagText))
               {
                  return ret;
               }

               sites.forEach(function(site)
               {
                  const siteBaseHost = site.site_url.replace(/^https?:\/\//, '');
                  if (siteBaseHost == window.location.host) return;

                  const siteBaseHostStripped = siteBaseHost.replace('.com', '');

                  if (RegExp(`\\b${siteBaseHostStripped}\\b`, 'i').test(flagText) ||
                      RegExp(`\\b${siteBaseHostStripped}\\b`.replace('.stackexchange', ''), 'i').test(flagText) ||
                      RegExp(`\\b${siteBaseHostStripped}\\b`.replace('.stackoverflow', ''), 'i').test(flagText) ||
                      RegExp(site.name.replace(' ', '\\s?'), 'i').test(flagText))
                  {
                     ret = { baseHostAddress: siteBaseHost, name: site.name };
                     return ret;
                  }
               });

               return ret;
         });

         function loadMigrationSites()
         {
            const ret = $.Deferred();
            const cachekey = "flaaaaags.site-cache";
            let cacheExpiration = new Date();
            cacheExpiration = cacheExpiration.setHours(cacheExpiration.getHours()-24);
            let siteCache = localStorage.getItem(cachekey);
            if (siteCache)
            {
               siteCache = JSON.parse(siteCache);
            }
            if (siteCache && (siteCache.age > cacheExpiration))
            {
               ret.resolve(siteCache.sites);
               return ret;
            }

            return $.get('https://api.stackexchange.com/2.2/sites?pagesize=500')
               .then(function(data)
               {
                  let sites = [];
                  const siteArray = data.items;
                  if (siteArray && siteArray.length && siteArray[0].name)
                  {
                     sites = siteArray;
                     localStorage.setItem(cachekey, JSON.stringify({age: Date.now(), sites: sites}));
                  }
                  return sites;
               });
         }
      }

   });
}

function initQuestionPage()
{
   let flagCache = {};
   let waffleFlags = GetFlagInfoFromWaffleBar();
   if (!waffleFlags.length)
   {
      waffleFlags = GetFlagInfoFromNewFlagBar();
   }

   for (const fp of waffleFlags)
   {
      flagCache[fp.postId] = fp;
   }

   // give up on the waffle bar if it's listing all flags as handled for a given post - load full flag info.
   // also do this if any flag might've put the post into review, so we can indicate that too
   const loadingFlags = waffleFlags.filter(pf => pf.dirty || pf.flags.some(f => IsReviewFlag(f))).map( pf => RefreshFlagsForPost(pf.postId) );
   RenderToCInWaffleBar();

   StackExchange.initialized
      .then(initFlags);

   $("#content")
      // Wire up the comment flag dismissal button.
      .on("click", ".flag-dismiss-comment", function(ev)
      {
         ev.preventDefault();

         const dismissLink = $(this);
         const post = dismissLink.parents(".question, .answer");
         const postId = post.data("questionid") || post.data("answerid");
         const commentId = dismissLink.parents(".comment").attr("id").match(/comment-(\d+)/)[1];
         let flagInfo = dismissLink.parents(".flag-info");
         if (!flagInfo.length)
         {
            flagInfo = dismissLink.parents(".comment").find(".flag-info");
         }
         const flagIds = flagInfo.data("flag-ids");
         const flagListItem = flagInfo.parent();
         if (!commentId || !flagListItem.length) return;

         FlagFilter.tools.dismissAllCommentFlags(commentId, flagIds)
            .done(function() { flagListItem.hide('medium'); dismissLink.hide(); /* annoying - don't do this RefreshFlagsForPost(postId); */  });
      })

      // Wire up the "dismiss all" buttons.
      .on("click", ".mod-tools .flag-dismiss-all-helpful, .mod-tools .flag-dismiss-all-decline", function()
      {
         const btn = $(this);
         const post = btn.parents(".question, .answer");
         const postId = post.data("questionid") || post.data("answerid");

         const choice = btn.is(".flag-dismiss-all-helpful") ? FlagFilter.tools.flagHelpfulUI(btn.parent())
                                                            : FlagFilter.tools.flagDeclineUI(btn.parent());

         choice.then(function(dismissal)
         {
            FlagFilter.tools.dismissAllFlags(postId, dismissal.helpful, dismissal.declineId, dismissal.comment)
               .done(function()
               {
                  post.find('tr.mod-tools').slideUp();
                  RefreshFlagsForPost(postId).then( () => post.find('tr.mod-tools').sideDown('fast') );
               });
         });
      })

      // historical flag expansion
      .on("click", "a.show-all-flags", function()
      {
         const holder = $(this).parent();
         const postId = $(this).data('postid');
         const link = holder.find('a.show-all-flags');
         const spinner = $("<span> loading <img src='//sstatic.net/img/progress-dots.gif'></span>");
         spinner.insertAfter(link.hide());

         RefreshFlagsForPost(postId, true)
            .catch(function() {
               link.show();
               spinner.remove();
            });
      })

   $(document)
      .ajaxSuccess(function(event, XMLHttpRequest, ajaxOptions)
      {
         $('#content .js-comment-delete span.hover-only-label').addClass("delete-tag").text("");

         if (/\/posts\/\d+\/comments/.test(ajaxOptions.url))
         {
            const postId = +ajaxOptions.url.match(/\/posts\/(\d+)\/comments/)[1];
            setTimeout(() => ShowCommentFlags(postId), 1);
         }
         /* uncomment to allow live refreshes while deleting comments - I find this annoying.
         else if ( /\/posts\/comments\/\d+\/vote\/10/.test(ajaxOptions.url))
         {
            var commentId = +ajaxOptions.url.match(/\/(\d+)\//)[1];
            var post = $("#comment-" + commentId).parents(".question,.answer");
            var postId = post.data("answerid")||post.data("questionid");
            setTimeout(() => RefreshFlagsForPost(postId), 1);
         } */
         else if ( /\/posts\/\d+\/vote\/10/.test(ajaxOptions.url))
         {
            const postId = +ajaxOptions.url.match(/\/(\d+)\//)[1];
            setTimeout(() => RefreshFlagsForPost(postId), 1);
         }
      });

   function RefreshFlagsForPost(postId, expandComments)
   {
      const postContainer = $(".answer[data-answerid='"+postId+"'],.question[data-questionid='"+postId+"']")
      if (postContainer.length)
      {
         return LoadAllFlags(postId)
            .then(flags => ShowFlags(postContainer, flags, expandComments))
            .then(flags => RenderToCInWaffleBar());
      }
   }

   function initFlags()
   {
      const posts = $(".question, .answer");

      posts.each(function()
      {
         const postContainer = $(this),
            postId = postContainer.data('questionid') || postContainer.data('answerid'),
            issues = postContainer.find(".js-post-issue"),
            flagsLink = issues.filter("a[href='/admin/posts/" + postId + "/show-flags']"),
            commentsLink = issues.filter("a[href='/admin/posts/" + postId + "/comments']"),
            flags = flagCache[postId],
            totalFlags = flagsLink.length ? +flagsLink.text().match(/\d+/)[0] : 0;

         if (!flagsLink.length) return;

         // NOTE: Flags are referred to as "inactive" here, not "resolved", since review flags
         //       that are less than 1 hour old aren't shown to mods by default, so they won't
         //       appear in the waffle bar. However, it would be incorrect to say that these
         //       are "resolved". The correct information is loaded after clicking to load,
         //       so simply using the generic "inactive" is technically more correct
         //       (i.e., the best kind).
         const tools = $(`<div class="s-card bs-md mod-tools mod-tools-post" data-totalflags="${totalFlags}">
    <h3 class='flag-summary'><a class='show-all-flags' data-postid='${postId}'>${totalFlags} inactive post flags (click to load)</a></h3>
    <ul class="flags">
    </ul>
    <div class="mod-actions">
    </div>
    <ul class="reviews">
    </ul>
</div>`);
         if (makeFlagInfoStickyAndFloatAbovePost)
         {
            tools.prependTo(postContainer);
         }
         else
         {
            tools.insertBefore(postContainer.find("div:has(>.comments)"));
         }

         if (flags)
         {
            ShowFlags(postContainer, flags, true);
         }
      });

   }

   function ShowFlags(postContainer, postFlags, forceCommentVisibility)
   {
      const tools = postContainer.find(".mod-tools-post");
      const modActions = tools.find(".mod-actions")
         .empty();

      const flagContainer = tools.find("ul.flags")
         .empty();
      let activeCount = 0;
      let inactiveCount = 0;
      let nonDisputedRedCount = 0;
      for (const flag of postFlags.flags)
      {
         if (flag.active)
         {
            activeCount += flag.flaggers.length;
         }
         else
         {
            inactiveCount += flag.flaggers.length;
         }

         if ((flag.description.toLowerCase() === "spam" || flag.description.toLowerCase() === "rude or abusive") &&
             (flag.result.toLowerCase() !== "disputed"))
         {
            ++nonDisputedRedCount;
         }

         FlagFilter.tools.predictMigrationDest(flag.description)
            .done(function(site)
            {
               if (modActions.find(".migration-link").length) return;
               if (!site.name) return;
               $(`<button type='button' class='migration-link s-btn s-btn__muted s-btn__outlined' title='migrate this question to a site chosen by the magic 8-ball'>Migrate to ${site.name}</button>`)
                  .click(function()
                  {
                     const questionId = location.pathname.match(/\/questions\/(\d+)/)[1];
                     if (confirm(`This question will be immediately migrated to ${site.name} (${site.baseHostAddress}).\n\nContinue with the migration?`))
                     {
                        FlagFilter.tools.migrateTo(questionId, site.baseHostAddress)
                           .done(function() { location.reload() })
                           .fail(function() { alert("something went wrong") });
                     }
                  })
                  .appendTo(modActions);
            })

         flagContainer.append(RenderFlagItem(false, flag, postFlags.reviews));
      }

      if ((nonDisputedRedCount > 0) && (!tools.find(".flag-dispute-spam").length))
      {
         $("<button type='button' class='flag-dispute-spam s-btn s-btn__filled' title='Clears all rude/abusive and spam flags on this post, as well as any automatic Community downvotes. The flags will be marked as disputed. If this post reached the flag limit, it will be undeleted and unlocked, and the owner will have their rep restored.'>Clear all spam/abusive flags</button>")
         .appendTo(modActions)
         .click(function()
         {
            if (confirm("This will undelete the post, remove all penalties against the author, and dispute ALL rude/abusive and spam flags EVER raised on it.\n\nAre you sure?"))
            {
               FlagFilter.tools.disputeSpamAbusiveFlags(postFlags.postId);
            }
         });
      }

      tools.toggleClass("active-flag", !!activeCount);

      if (activeCount > 0)
      {
         modActions.prepend(`
                            <button class="flag-dismiss-all-helpful s-btn s-btn__outlined" type="button" title="mark all pending flags as helpful">Helpful all&hellip;</button>
                            <button class="flag-dismiss-all-decline s-btn s-btn__outlined s-btn__danger" type="button" title="mark all pending flags as declined">Decline all&hellip;</button>
                            `);
      }

      const totalFlags = tools.data("totalflags");
      const commentFlags = postFlags.commentFlags.reduce((acc, f) => acc + f.flaggers.length, 0);
      // this... really just hacks around incomplete information in the waffle bar
      postFlags.assumeInactiveCommentFlagCount = totalFlags - (activeCount+inactiveCount) - commentFlags;

      if (postFlags.flags.length)
      {
         const flagSummary = [];
         if (activeCount > 0) flagSummary.push(activeCount + " active post flags");
         if (inactiveCount) flagSummary.push(inactiveCount + " resolved post flags");
         if (postFlags.assumeInactiveCommentFlagCount) flagSummary.push(`*<a class='show-all-flags' data-postid='${postFlags.postId}' title='Not sure about these flags; click to load accurate information for ${postFlags.assumeInactiveCommentFlagCount} undefined flags'> click to load full flag info</a>`);

         tools.show()
              .find("h3.flag-summary").html(flagSummary.join("; "));
      }
      else if (postFlags.assumeInactiveCommentFlagCount)
      {
         tools.show()
              .find("h3.flag-summary").html(`*<a class='show-all-flags' data-postid='${postFlags.postId}' title='Not sure about these flags; click to load accurate information for ${postFlags.assumeInactiveCommentFlagCount} undefined flags'> click to load full flag info</a>`);
      }
      else
         tools.hide();

      if (postFlags.commentFlags.length && forceCommentVisibility)
      {
         const issues = postContainer.find(".js-post-issue"),
            moreCommentsLink = $("#comments-link-" + postFlags.postId + " a.js-show-link:last:visible"),
            deletedCommentsLink = issues.filter("a[href='/admin/posts/" + postFlags.postId + "/comments']"),
            inactiveCommentFlags = !postFlags.commentFlags.every(f => f.active);

         // load comments to trigger flag display
         if (inactiveCommentFlags && deletedCommentsLink.length)
         {
            deletedCommentsLink.click();
         }
         else if (moreCommentsLink.length)
         {
            moreCommentsLink.click();
         }
         else
         {
            ShowCommentFlags(postFlags.postId);
         }
      }
      else if (totalFlags > activeCount-inactiveCount || $("#comments-" + postFlags.postId + " .mod-tools-comment").length)
      {
         ShowCommentFlags(postFlags.postId);
      }

/* diagnostics

      if ( postFlags.reviews )
      {
         let reviews = '';
         for (let task of postFlags.reviews.sort((a,b) => b.creationDate-a.CreationDate) )
         {
            reviews += `
            <li>
                  <span title="${FlagFilter.tools.formatISODate(task.creationDate)}" class="relativetime-clean">${FlagFilter.tools.formatDate(task.creationDate)}</span>
                  <a href="${task.url}">${task.type}</a>
            `;
            if ( task.result )
               reviews += `<span>ended
                  <span title="${FlagFilter.tools.formatISODate(task.resultDate)}" class="relativetime-clean">${FlagFilter.tools.formatDate(task.resultDate)}</span>:
               ${task.result}</span>`;
            else
               reviews += "<i>pending...</i>";
            reviews += "</li>";
         }
         tools.find("ul.reviews").empty().append(reviews);
      }
*/

      setTimeout(() => StackExchange.realtime.updateRelativeDates(), 100);
   }

   function ShowCommentFlags(postId)
   {
      const commentContainer = $("#comments-" + postId);
      const postContainer = commentContainer.closest(".question, .answer");
      const tools = postContainer.find(".mod-tools-post");
      const postFlags = flagCache[postId];
      let commentModToolsContainer = commentContainer.find(".mod-tools-comment");

      if (!postFlags || ((!postFlags.commentFlags.length || !commentContainer.length) && !postFlags.assumeInactiveCommentFlagCount) )
      {
         commentModToolsContainer.remove();
         return;
      }

      if (!commentModToolsContainer.length)
      {
         commentModToolsContainer = $(`<div class="mod-tools mod-tools-comment-header">
                                          <h3 class="comment-flag-summary"></h3>
                                       </div>`);
         commentContainer
            .addClass("mod-tools")
            .find(">ul.comments-list").before(commentModToolsContainer);
      }

      commentContainer
         .removeClass("dno")
         .find(".comment").removeClass("active-flag").end()
         .find(".comment-text .flags").remove();

      let activeCount = 0;
      let inactiveCount = 0;
      let flagsShown = 0;
      for (const flag of postFlags.commentFlags)
      {
         const comment = commentContainer.find("#comment-" + flag.commentId);
         let container = comment.find(".comment-text .flags");
         if (!container.length)
         {
            container = $('<div><ul class="flags"></ul></div>')
               .appendTo(comment.find(".comment-text"))
               .find(".flags");
         }

         comment.addClass("mod-tools-comment");

         if (flag.active)
         {
            activeCount += flag.flaggers.length;
            comment.addClass("active-flag");
         }
         else
         {
            inactiveCount += flag.flaggers.length;
         }

         if (!comment.length) continue;

         flagsShown += flag.flaggers.length;
         const flagItem = RenderFlagItem(true, flag);
         const flagDismiss = flagItem.find(".flag-dismiss-comment").remove();
         container.append(flagItem);
         if (!comment.find(".flag-dismiss-comment").length)
         {
            flagDismiss
               .html("dismiss<br>flags")
               .removeClass("delete-tag")
               .appendTo(comment.find(".comment-actions"));
         }
      }

      commentModToolsContainer.toggleClass("active-flag", !!activeCount);

      const totalFlags = tools.data("totalflags");
      let flagSummary = [];
      if (activeCount > 0)
      {
         flagSummary.push(`<a class='show-all-flags' data-postid='${postFlags.postId}' title='load complete flag details'>${activeCount} active comment flags</a>`);
      }

      inactiveCount = inactiveCount || postFlags.assumeInactiveCommentFlagCount;
      if (inactiveCount)
      {
         flagSummary.push(`${inactiveCount} resolved comment flags${postFlags.assumeInactiveCommentFlagCount ? '*' : ''}`);
      }

      if (flagsShown < (inactiveCount + activeCount))
      {
         flagSummary.push(`(${flagsShown} shown; load all comments to view the rest)`);
      }

      commentContainer.find("h3.comment-flag-summary")
         .html(flagSummary.join("; "));
   }

   function RenderFlagItem(isComment, flag, reviews)
   {
      let flagItemHtml = `
          <li class="${flag.active ? 'active-flag' : 'o60'}">
             <span class="flag-text revision-comment">${flag.description}</span>
             <span class="flag-info" data-flag-ids="${flag.flagIds ? flag.flagIds.join(';') : ''}">
                 &ndash;
                <span class="flaggers"></span>`;
      if (isComment)
      {
         if (flag.active)
         {
            flagItemHtml += `
               <a class="flag-dismiss-comment" title="dismiss this comment flag, marking it as declined"></a>`;
         }
         flagItemHtml += '</span>';
      }
      else
      {
         flagItemHtml += '</span>';
         if (flag.active)
         {
            flagItemHtml += `
            <div class="dismiss-flag-popup-buttons">
                <button type="button" class="flag-dismiss-helpful s-btn s-btn__link s-btn__outlined" data-type="helpful" title="mark this pending flag as helpful">Helpful&hellip;</button>
                &nbsp;|&nbsp;
                <button type="button" class="flag-dismiss-decline s-btn s-btn__link s-btn__outlined s-btn__danger" data-type="decline" title="mark this pending flag as declined">Decline&hellip;</button>
            </div>`;
         }
      }
      flagItemHtml += '</li>';

      const flagItem = $(flagItemHtml);

      if (flag.result)
      {
         $("<div class='flag-outcome'><i></i></div>")
               .find("i").text(flag.result).end()
            .append(flag.resultUser ? `<span> &ndash; </span><a href="/users/${flag.resultUser.userId}" class="flag-creation-user comment-user">${flag.resultUser.name}</a>` : '<span> &ndash; </span>')
            .append(`<span class="flag-creation-date comment-date" dir="ltr"> <span title="${FlagFilter.tools.formatISODate(flag.resultDate)}" class="relativetime-clean">${FlagFilter.tools.formatDate(flag.resultDate)}</span></span>`)
            .appendTo(flagItem);
      }
      else if (reviews && IsReviewFlag(flag))
      {
         const flagCreationDate = flag.flaggers && flag.flaggers.length ? new Date(flag.flaggers.reduce( (min, cur) => Math.min(min, cur.flagCreationDate), Infinity)) : 0;
         for (const task of reviews.sort((a,b) => b.creationDate-a.CreationDate).filter(t => t.type === "low quality" && t.creationDate > flagCreationDate ) )
         {
            if (task.result)
            {
               $(`<div class='flag-outcome'><a href="${task.url}">reviewed</a>: <i>${task.result}</i> <span title="${FlagFilter.tools.formatISODate(task.resultDate)}" class="relativetime-clean">${FlagFilter.tools.formatDate(task.resultDate)}</span></div>`).appendTo(flagItem);
            }
            else
            {
               $(`<div class='flag-outcome'><a href="${task.url}">in review</a> since <span title="${FlagFilter.tools.formatISODate(task.creationDate)}" class="relativetime-clean">${FlagFilter.tools.formatDate(task.creationDate)}</span></div>`).appendTo(flagItem);
            }
         }
      }

      if (flag.flaggers)
      {
         let flaggerNames = [];
         for (const user of flag.flaggers)
         {
            if (!user) continue;

            const userLink = user.name
               ? $(`<a href="/users/${user.userId}" class="flag-creation-user comment-user"></a>`)
                  .text(user.name)
                  .wrap('<div></div>').parent()
                  .html()
               : '';
            const flagDate = user.flagCreationDate.getTime()
               ? `<span class="flag-creation-date comment-date" dir="ltr"><span title="${FlagFilter.tools.formatISODate(user.flagCreationDate)}" class="relativetime-clean">${FlagFilter.tools.formatDate(user.flagCreationDate)}</span></span>`
               : '';

            flaggerNames.push( userLink + ' ' + flagDate );
         }

         flagItem.find(".flaggers").append(flaggerNames.join(", "));
      }

      if (!isComment)
      {
         // Wire up the flag dismissal buttons.
         flagItem.on("click", ".flag-dismiss-helpful, .flag-dismiss-decline", function()
         {
            const btn = $(this);
            const post = btn.parents(".question, .answer");
            const postId = post.data("questionid") || post.data("answerid");
            const flagListItem = btn.parents("li");
            const flagIds = flagListItem.find(".flag-info").data("flag-ids");
            if (!postId || !flagListItem.length || !flagIds) return;

            // Remove old, just in case.
            flagListItem.parent().find(".dismiss-flag-popup").remove();

            // Display new.
            const choice = btn.is(".flag-dismiss-helpful") ? FlagFilter.tools.flagHelpfulUI(btn.parent())
                                                           : FlagFilter.tools.flagDeclineUI(btn.parent());
            choice.then(function(dismissal)
            {
               FlagFilter.tools.dismissFlag(postId, flagIds, dismissal.helpful, dismissal.declineId, dismissal.comment)
                  .done(function(){ flagListItem.hide('medium'); RefreshFlagsForPost(postId); });
            });
         });
      }

      return flagItem;
   }

   function IsReviewFlag(flag)
   {
      return flag.active &&
             (flag.description.toLowerCase() == "not an answer" ||
              flag.description.toLowerCase() == "very low quality" ||
              /Low answer quality score/.test(flag.description));
   }

   function RenderToCInWaffleBar()
   {
      let flagToC = $("<ul class='flagToC'>");
      for (const postId in flagCache)
      {
         let post = $(".answer[data-answerid='"+postId+"'],.question[data-questionid='"+postId+"']"),
            postType = post.is(".answer") ? "answer" : "question",
            userLink = post.find(".user-details[itemprop='author'] a[href^='/users/']:first,.user-details #history-"+postId),
            attribution = (userLink.is('#history-'+postId) ? '(wiki)' : "by " + userLink.text()),
            url = (postType == 'question' ? '#question' : "#" + postId);
         if (!post.length) // handle flags spanning multiple pages of answers
         {
            url = ('/a/' + postId);
            postType = "answer";
            attribution = "on another page";
         }
         const flagSummaries = SummarizeFlags(flagCache[postId], 3).map(function(summary)
         {
            const ret = $(`<li data-count='${summary.count}&times;'>`);
            ret.attr("title", summary.description  + "\n-- " + summary.flaggerNames);
            if (!summary.active)
            {
               ret.addClass("inactive");
            }
            if (summary.type.toLowerCase() == 'comment')
            {
               $("<a>").attr("href", (/#/.test(url) ? '' : url) + "#comments-"+postId).text("(comment) " + summary.description).appendTo(ret);
            }
            else
            {
               ret.text(summary.description);
            }
            return ret;
         });
         const entry = $("<li>");
         entry.append($("<a>")
            .attr("href", url)
            .text(postType + " " + attribution)
            .append($("<ul>").append(flagSummaries))
         );

         flagToC.append(entry);
      }

      if (!Object.keys(flagCache).length)
      {
         flagToC = $("<div style='padding:4px;' class='mx24'>All active flags on this page are currently in review; check back later to see if they were handled.</div>");
      }

      $('#postflag-bar .flag-wrapper, #postflag-bar .flagToC, .js-post-flag-bar>div>div').remove();
      $("<div class='flag-summary grid fl1 fd-column'>").insertBefore($('#postflag-bar .nav-button.prev, #postflag-bar .nav-button.close, .js-post-flag-bar>div>button').first()).append(flagToC);
      $('#postflag-bar').show();

      function SummarizeFlags(flaggedPost, maxEntries)
      {
         const flags = flaggedPost.flags.concat(Object.values(flaggedPost.commentFlags.reduce(function(acc, cf)
            {
               const key = cf.description + cf.active;
               const composite = acc[key] || {commentId: -1, description: cf.description, flaggers: [], active: cf.active};
               composite.flaggers.push.apply(composite.flaggers, cf.flaggers.length ? cf.flaggers : ["unknown"]);
               acc[key] = composite;
               return acc;
            }, {}))
         );
         maxEntries = maxEntries < 0 ? flags.length : maxEntries||3;
         const ordered = flags.sort((a,b) => b.active-a.active || b.flaggers.length-a.flaggers.length || b.description.length-a.description.length);
         const bite = maxEntries < flags.length ? maxEntries-1||1 : maxEntries;
         const ret = ordered.slice(0,bite)
            .map(f => ({count: f.flaggers.length||1, description: f.description, active: f.active, type: f.commentId ? 'comment' : 'post', flaggerNames: f.flaggers.map(u => u.name||'').join(",")}));
         if (ordered.length > bite && maxEntries > bite)
         {
            ret.push({count: ordered.slice(bite).reduce((acc, f) => (f.flaggers.length||1) + acc, 0), description: " more...", type: 'more'});
         }
         return ret;
      }
   }

   function LoadAllFlags(postId)
   {
      return LoadTimeline().then(ParseTimeline).then( af => flagCache[postId] = af );

      function LoadTimeline()
      {
         return fetch("/posts/" + postId + "/timeline?mod=true", {method: "GET", credentials: "include"})
            .then( resp => resp.text() )
            .then( respText => new DOMParser().parseFromString(respText, "text/html") );
      }

      function ParseTimeline(dom)
      {
         const ret = {
            postId: postId,
            flags: [],
            commentFlags: [],
            reviews: []
         };

         const flagList = Array.from(dom.querySelectorAll(".post-timeline .event-rows tr[data-eventtype=flag]"));
         const flaggedCommentList = Array.from(dom.querySelectorAll(".post-timeline .event-rows tr[data-eventtype=comment] td.event-comment .js-toggle-comment-flags[data-flag-ids]"));
         const reviewList = Array.from(dom.querySelectorAll(".post-timeline .event-rows tr[data-eventtype=review]"));
         const commentMap = flaggedCommentList.reduce( function(acc, fc)
            {
               const flagIds = fc.dataset.flagIds.split(';');
               const parentRow = fc.closest("tr[data-eventtype=comment]");
               for (const id of flagIds)
               {
                  acc[id] = parentRow;
               }
               return acc;
            }, {});
         const deletionList = Array.from(dom.querySelectorAll(".post-timeline .event-rows tr.deleted-event[data-eventid]+tr"));
         for (const row of flagList)
         {
            const id = +row.dataset.eventid;
            const deleteRow = deletionList.find( el => el.dataset.eventid==id );
            const created = row.querySelector(":scope>td.creation-date span.relativetime");
            const eventType = row.querySelector(":scope>td.event-type>span.event-type");
            const flagType = row.querySelector(":scope>td.event-type+td>span");
            const flagger = row.querySelector(":scope>td>span.js-created-by>a");
            const description = row.querySelector(":scope>td.event-comment>span");
            const deleted = deleteRow && deleteRow.querySelector(":scope>td.creation-date span.relativetime");
            const mod = deleteRow && deleteRow.querySelector(":scope>td>span.js-created-by>a");
            const result = deleteRow && deleteRow.querySelector(":scope>td.event-comment>span");

            if (!created || !eventType || !flagType) continue;

            const flag =
            {
               flagIds: [id],
               description: (description && description.innerHTML.trim()) || (flagType && flagType.textContent.trim()) || "",
               active: !deleted,
               result: (result && result.textContent.trim()) || "",
               resultDate: deleted ? FlagFilter.tools.parseISODate(deleted.title) : null,
               resultUser:
               {
                  userId: mod ? +mod.href.match(/\/users\/([-\d]+)/)[1] : -1,
                  name: (mod && mod.textContent.trim()) || ""
               },
               flaggers: [
               {
                  userId: flagger ? +flagger.href.match(/\/users\/([-\d]+)/)[1] : -1,
                  name: (flagger && flagger.textContent.trim()) || "",
                  flagCreationDate: FlagFilter.tools.parseISODate(created.title)
               }]
            };

            if (eventType.textContent.trim() === "comment flag")
            {
               const comment = commentMap[id];
               if (comment)
               {
                  flag.commentId = +comment.dataset.eventid;
               }

               ret.commentFlags.push(flag);
            }
            else
            {
               ret.flags.push(flag);
            }
         }

         ret.reviews = reviewList.map(function(row)
         {
            const id = +row.dataset.eventid;
            const deleteRow = deletionList.find( el => el.dataset.eventid==id );
            const created = row.querySelector(":scope>td.creation-date span.relativetime");
            const reviewType = row.querySelector(":scope>td.event-type+td>span>a");
            const completed = deleteRow && deleteRow.querySelector(":scope>td.creation-date span.relativetime");
            const resultType = deleteRow && deleteRow.querySelector(":scope>td.event-type+td>span");
            const result = deleteRow && deleteRow.querySelector(":scope>td.event-comment>span");

            return {
               id: id,
               creationDate: FlagFilter.tools.parseISODate(created.title),
               type: (reviewType && reviewType.textContent.trim()) || "",
               url: reviewType && reviewType.href,
               resultDate: completed ? FlagFilter.tools.parseISODate(completed.title) : null,
               result: (result && result.textContent.trim()) || (resultType && resultType.textContent.trim())
            };
         });

         // consolidate flags with similar description and disposition

         function consolidate(flagList)
         {
            return Object.values(flagList.reduce( function(acc, f)
               {
                  const key = [f.commentId, f.description, f.active, f.resultDate, f.resultUser && f.resultUser.userId].join(":");
                  const composite = acc[key] || {
                     commentId: f.commentId,
                     description: f.description,
                     active: f.active,
                     result: f.result,
                     resultDate: f.resultDate,
                     resultUser: f.resultUser,
                     flaggers: [],
                     flagIds: [] };
                  composite.flaggers.push.apply(composite.flaggers, f.flaggers.map(u => Object.assign({}, u)));
                  composite.flagIds.push.apply(composite.flagIds, f.flagIds);
                  acc[key] = composite;
                  return acc;
               }, {}) );
         }

         ret.flags = consolidate(ret.flags);
         ret.commentFlags = consolidate(ret.commentFlags);

         return ret;
      }
   }

   // this should be considered incomplete AT BEST
   // The truth is, the flag bar intentionally omits some information (full list of flaggers, comment flaggers)
   // and is incorrect in regard to some other information (showing active flags as inactive in cases where a flag has been handled)
   function GetFlagInfoFromWaffleBar()
   {
      return $(".flagged-post-row")
         .map(function()
         {
            const fp = $(this);
            const ret = {
               postId: fp.data("post-id"),

               flags: fp.find(".flag-row")
                  .map(function()
                  {
                     const flag = $(this);
                     let ids = flag.data("flag-ids");
                     ids = ids.split ? ids.split(';')
                        .map(id => +id) : [ids];
                     return {
                        flagIds: ids,
                        description: $.trim(flag.find(".revision-comment")
                           .html()),
                        active: flag.find(".active-flag")
                           .length > 0,
                        flaggers: flag.find(">td>a[href*='/users/']")
                           .map(function()
                           {
                              const userId = this.href.match(/\/users\/([-\d]+)/);
                              return {
                                 userId: userId && userId.length > 0 ? +userId[1] : null,
                                 name: this.textContent,
                                 flagCreationDate: FlagFilter.tools.parseISODate($(this)
                                    .nextAll(".relativetime:first")
                                    .attr('title'), new Date(0))
                              };
                           })
                           .toArray()
                     };
                  })
                  .toArray(),

               commentFlags: fp.find("table.comments tr .flagcount")
                  .map(function()
                  {
                     const flagText = $(this).next(".revision-comment");
                     const flaggedComment = $(this).closest("tr");
                     const commentId = flaggedComment.attr("class")
                        .match(/comment-flagged-(\d+)/);
                     const flaggers = flagText.nextUntil(".flagcount", "a[href*='/users/']");
                     if (!commentId || commentId.length < 2) return;
                     return {
                        commentId: +commentId[1],
                        active: true,
                        description: $.trim(flagText.html()),
                        flaggers: flaggers.length
                           ? flaggers.map(function()
                           {
                              const userId = this.href.match(/\/users\/([-\d]+)/);
                              return {
                                 userId: userId && userId.length > 0 ? +userId[1] : null,
                                 name: this.textContent,
                                 flagCreationDate: FlagFilter.tools.parseISODate($(this)
                                    .nextAll(".relativetime:first")
                                    .attr('title'), new Date(0))
                              };
                           }).toArray()
                           : Array(+$(this).text()).fill({userId: null, name: "", flagCreationDate: new Date(0)})
                     };
                  })
                  .toArray()
            };
            if (!ret.flags.some( f => f.active ) && !ret.commentFlags.some(f => f.active))
            {
               ret.dirty = true;
            }
            return ret;
         })
         .toArray();
   }

   function GetFlagInfoFromNewFlagBar()
   {
      return $(".js-flagged-post")
         .map(function()
         {
            const fp = $(this);
            const ret = {
               postId: fp.data("post-id"),

               flags: fp.find(".js-post-flag-group")
                  .map(function()
                  {
                     const flag = $(this);
                     let ids = flag.data("flag-ids");
                     ids = ids.split ? ids.split(';')
                        .map(id => +id) : [ids];
                     const mess = flag.find(">div:first .js-flag-text");

                     let foundUser = false;
                     const tmp = $("<div>");
                     const description = tmp.append( mess.contents().filter( function() { foundUser = foundUser || $(this).has("a[href^='/users/']").length; return !foundUser; }).clone() ).html().replace(/\s+-\s+$/, '');
                     return {
                        flagIds: ids,
                        description: description,
                        active: flag.find(".js-dismiss-flags")
                           .length > 0,
                        flaggers: mess.find(">span>a[href^='/users/']")
                           .map(function()
                           {
                              const userId = this.href.match(/\/users\/([-\d]+)/);
                              return {
                                 userId: userId && userId.length > 0 ? +userId[1] : null,
                                 name: this.textContent,
                                 flagCreationDate: FlagFilter.tools.parseISODate($(this)
                                    .parent()
                                    .nextAll(".relativetime:first, span[title]").first()
                                    .attr('title'), new Date(0))
                              };
                           })
                           .toArray()
                     };
                  })
                  .toArray(),


               commentFlags: fp.find(".js-flagged-comment")
                  .map(function()
                  {
                     const mess = $(".js-flag-text", this);
                     let foundUser = false;
                     const tmp = $("<div>");
                     const description = tmp.append( mess.contents().filter( function() { foundUser = foundUser || $(this).has("a[href^='/users/']").length; return !foundUser; }).clone() ).html().replace(/\s+-\s+$/, '');

                     const commentId = $(".js-comment-link", this).attr("href").match(/#comment(\d+)_\d+/);
                     const flaggers = mess.find(">span>a[href^='/users/']")
                           .map(function()
                           {
                              const userId = this.href.match(/\/users\/([-\d]+)/);
                              return {
                                 userId: userId && userId.length > 0 ? +userId[1] : null,
                                 name: this.textContent,
                                 flagCreationDate: FlagFilter.tools.parseISODate($(this)
                                    .parent()
                                    .nextAll(".relativetime:first, span[title]").first()
                                    .attr('title'), new Date(0))
                              };
                           })
                           .toArray();

                     if (!commentId || commentId.length < 2) return;
                     return {
                        commentId: +commentId[1],
                        active: true,
                        description: description,
                        flaggers: flaggers
                     };
                  })
                  .toArray()
            };
            if (!ret.flags.some( f => f.active ) && !ret.commentFlags.some(f => f.active))
            {
               ret.dirty = true;
            }
            return ret;
         })
         .toArray();
   }

}

});
