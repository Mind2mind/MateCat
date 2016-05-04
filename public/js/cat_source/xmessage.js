
if (true)
(function($, UI, _, undefined) {

    var askForPreview =  _.debounce(function(segment) {
        if ( !segment.el.hasClass('opened') ) return ;


        var content = segment.el.find('.editarea').clone() ;
        content.find('.rangySelectionBoundary').remove();

        content[0].normalize();

        var text = content
            .text()
            .replace(/\u00A0/g, ' ') // Non breaking space replaced
        ;

        if (text.length > 0) {
            var url = config.basepath +
                    'plugins/xmessage/preview?' +
                    $.param( { text : text, locale : config.target_rfc }) ;

            $.getJSON( url )
            .done( function(data) {

                var preview_text;
                var error = false ;

                if ( data.preview == null ) {
                    preview_text = 'Error: unsupported Java Message pattern' ;
                    error = true ;
                } else {
                    preview_text = data.preview ;
                }

                var container = segment.el.find('.target.item') ;
                container.find('.xmessage-preview').remove();

                var element = $('<p/>');
                element.addClass('xmessage-preview');


                element.append('<span class="xmessage-preview-title">Preview with random parameters</span><br />');

                var text_element = $('<span class="xmessage-preview-text"/>').text( preview_text ) ;
                if ( error ) text_element.addClass('xmessage-error');
                text_element.appendTo(element);

                element.append('<br/><a href="javascript:;" class="xmessage-reload-link">refresh</a>');

                container.append( element ) ;
            });
        }
    }, 300) ;

    $.extend(UI, {
        copySuggestionInEditarea : function() {
            return ;
        }
    });

    $(document).on('click', '.xmessage-reload-link', function(e) {
        var segment = new UI.Segment( $(e.target).closest('section') ) ;
        askForPreview( segment ) ;
    });

    $(document).on('copySourceToTarget', function(e) {
        var segment = new UI.Segment(e.target);
        askForPreview( segment ) ;
    });

    $(window).on('segmentClosed', function(e) {
        var segment = new UI.Segment( e.segment );
        segment.el.find('.xmessage-preview').remove();
    });

    $(window).on('segmentOpened', function(e) {
        askForPreview( e.segment ) ;
    });

    $(document).on('targetTextChanged', function(e, data) {
        askForPreview( data.segment ) ;
    });

})(jQuery, UI, _);


