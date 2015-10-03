

Y.use( 'node', 'node-event-simulate', 'squarespace-image-loader', 'squarespace-ui-base', function( Y ) {

  Y.on( 'domready', function() {

  // Init ImageLoader
  Y.all( 'body:not(.collection-type-template-page) img[data-src]' ).plug(Y.Squarespace.Loader2);

  if (Y.one('.page-image.content-fill')) {
		Y.on('resize', function() {ImageLoader.load(Y.one('.page-image img'));}, Y.config.win)
	}

  var adjustPositioning = function() {

    // changes #title-area to position:relative when content is bigger than available area
    if (Y.one('body.collection-type-template-page') || window.innerWidth <= 1024) {
      var titleArea = Y.one('#title-area'),
        titleAreaHeight = titleArea.get('offsetHeight'),
        freeformArea = Y.one('#homeBlockField'),
        freeformAreaHeight = freeformArea ? freeformArea.get('offsetHeight') : null,
        body = Y.one('body'),
        windowHeight = Y.one('body').get('winHeight'),
        mainNav =  Y.one('#main-navigation ul'),
        buffer = 0,
        social = Y.one('nav.social');

      if (body.hasClass('info-page-layout-poster') || window.innerWidth <= 1024) {
        buffer = mainNav.get('offsetHeight') + parseInt(mainNav.getComputedStyle('marginTop')) + parseInt(mainNav.getComputedStyle('marginBottom')) + 40;
        buffer += social && social.get('offsetHeight');
        windowHeight -=  buffer;
        
      }

      if (body.hasClass('info-page-layout-poster') && window.innerHeight <= 620){
        buffer = mainNav.get('offsetHeight') + parseInt(mainNav.getComputedStyle('marginTop')) + parseInt(mainNav.getComputedStyle('marginBottom')) + 40;
        buffer += social && social.get('offsetHeight');        
        titleArea.set('marginTop', buffer);

      }

      if (body.hasClass('info-page-layout-poster') || window.innerWidth <= 1024) {
        buffer = mainNav.get('offsetHeight') + parseInt(mainNav.getComputedStyle('marginTop')) + parseInt(mainNav.getComputedStyle('marginBottom')) + 40;
        buffer += social && social.get('offsetHeight');
        windowHeight -=  buffer;
        titleArea.set('marginTop', buffer);
      }


      if (body.hasClass('info-page-layout-business-card') || window.innerWidth <= 1024) {
        buffer = mainNav.get('offsetHeight') + parseInt(mainNav.getComputedStyle('marginTop')) + parseInt(mainNav.getComputedStyle('marginBottom')) + 40;
        // buffer += social && social.get('offsetHeight');
        windowHeight -=  buffer;
      }

      // Toggle Class
      if (Y.one('body:not(.freeform-text-on-info-page)')) {
        if (titleAreaHeight > windowHeight) {
          titleArea && titleArea.addClass('relative');
        } else {
          titleArea && titleArea.removeClass('relative');
        } 
      }

      if (Y.one('body.freeform-text-on-info-page')) {
        if (freeformAreaHeight > windowHeight) {
          freeformArea && freeformArea.addClass('relative');
        } else {
          freeformArea && freeformArea.removeClass('relative');
        } 
      }
    }

    if (!Y.one('#mobile-navigation')) {
      return;
    } else if (Y.one('#mobile-navigation').getStyle('display') == 'block' && Y.one('.social')) {
        var socialHeight = Y.one('.social').get('clientHeight'),
          socialSpace = parseInt(Y.one('#innerWrapper').getStyle('marginBottom'));

        if (socialHeight > socialSpace) {
          Y.one('#innerWrapper').setStyle('marginBottom', socialHeight + 10 + 'px');
        } else {
          Y.one('#innerWrapper').setStyle('marginBottom', '');
      }
    }
  }



  adjustPositioning();
  Y.on('resize', adjustPositioning, Y.config.win);

	// hiding pagination when hovering
  if (Y.one('html.no-touch')) {
    Y.all('.pagination div:not(.disabled).right').on('mouseenter', function () {
      Y.all('.pagination .left').addClass('hide');
    });

    Y.all('.pagination div:not(.disabled).right').on('mouseleave', function () {
      Y.all('.pagination .left').removeClass('hide');
    });

    Y.all('.pagination div:not(.disabled).left').on('mouseenter', function () {
      Y.all('.pagination .right').addClass('hide');
    });

    Y.all('.pagination div:not(.disabled).left').on('mouseleave', function () {
      Y.all('.pagination .right').removeClass('hide');
    });
  }
    // end

    var centerContent = function() {
      if (Y.one('body.collection-type-template-page'))  {
        Y.all('#title-area').each(function() {
          var contentHeight = Y.one('#title-area').get('offsetHeight');
          Y.all('#title-area').setStyle('marginTop', -(contentHeight / 2));
        });
        Y.all('#homeBlockField').each(function() {
          var blockHeight = Y.one('#homeBlockField').get('offsetHeight');
          Y.all('#homeBlockField').setStyle('marginTop', -(blockHeight / 2));
        });
      }
    }

    var siteTitle = Y.one('.collection-type-template-page #title-area h1');
    siteTitle && siteTitle.plug(Y.Squarespace.TextShrink, {
      parentEl: Y.one('.collection-type-template-page #title-area')
    });

    var siteTitleBlockField = Y.one('.collection-type-template-page #homeBlockField h1, .collection-type-template-page #homeBlockField h2, .collection-type-template-page #homeBlockField h3');
    siteTitleBlockField && siteTitleBlockField.plug(Y.Squarespace.TextShrink, {
      parentEl: Y.one('.collection-type-template-page #homeBlockField')
    });

    var siteTagline = Y.one('.collection-type-template-page .site-tagline');
    siteTagline && siteTagline.plug(Y.Squarespace.TextShrink, {
      parentEl: Y.one('.collection-type-template-page #title-area')
    });

    var siteDescription = Y.one('.site-desc');
    siteDescription && siteDescription.plug(Y.Squarespace.TextShrink, {
      parentEl: Y.one('.collection-type-template-page #title-area')
    });

    var siteEmail = Y.one('.collection-type-template-page .email');
    siteEmail && siteEmail.plug(Y.Squarespace.TextShrink, {
      parentEl: Y.one('.collection-type-template-page #title-area')
    });

    var pageTitle = Y.one('body:not(.collection-type-template-page) #title-area h1');
    pageTitle && pageTitle.plug(Y.Squarespace.TextShrink, {
      parentEl: Y.one('body:not(.collection-type-template-page) #title-area')
    });

    centerContent();
    Y.on('resize', centerContent, Y.config.win);


    Y.Global.on('tweak:change', function (f) {

      if (f.getName() === 'freeform-text-on-info-page') {
        centerContent();
      } else if (f.getName() === 'folderBgColor') {
        var openFolders = Y.all('li.folder.dropdown-open');
        var firstFolder = Y.one('li.folder');

        if (firstFolder && openFolders.size() === 0) {
          firstFolder.addClass('dropdown-open');
        }
      }

    });

    if (Y.one('body.collection-type-template-page')) {

      // var logoImageEl = Y.one('body.collection-type-template-page #title-area h1 img');
      centerContent();
      Y.all('#title-area').addClass('show');
      Y.all('#homeBlockField').addClass('show');
    }

    // AK 2012-12-27 load site logo on every page
    var siteLogo = Y.one('.site-title-image');
    if (siteLogo) {
      ImageLoader.load(siteLogo, {load: true});
    }

    Y.all('li.folder').each(function(elem) {
      elem.on('click', function() {
        toggleFolder(elem.siblings('li.folder.dropdown-open').item(0));
        toggleFolder(elem);
      });
    });

    //mobile nav
    var nav = Y.one('#mobile-navigation');
    if (nav) {
      Y.on('click', function(e) {
        nav.toggleClass('sqs-mobile-nav-open');
        Y.one('body').toggleClass('sqs-mobile-nav-open');
      }, '#mobile-navigation-label');
    }

    //folder subnav
    var toggleFolder = function(elem) {
      if (elem) {
        elem.toggleClass('dropdown-open');
      }
    };

    // moves fixed nav below announcement bar, then mimics position sticky as you scroll
    // can be cleaned up a bit
    var fixNavWhenNotificationBar = function() {
      if ( (Y.one('body:not(.collection-type-template-page).info-page-layout-offset') || Y.one('body:not(.collection-type-template-page).info-page-layout-business-card')) && Y.one('.sqs-announcement-bar') ) {
        var annBarHeight = Y.one('.sqs-announcement-bar').get('offsetHeight');
        Y.one('#main-navigation').setStyle('transform', 'translate3d(0,' + annBarHeight + 'px,0)');

        var scrollDistance = Y.config.win.scrollY;
        if (Y.config.win.scrollY < annBarHeight) {
          Y.one('#main-navigation').setStyle('transform', 'translate3d(0,' + (annBarHeight - scrollDistance) + 'px,0)');
        } else {
          Y.one('#main-navigation').setStyle('transform', 'translate3d(0,0,0)');
        }
      }
    };

    fixNavWhenNotificationBar();
    Y.on('scroll', function() {
      fixNavWhenNotificationBar();
    });

  });

});

