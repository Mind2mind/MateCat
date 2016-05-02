
if (true)
(function($, UI, _, undefined) {

    var askForPreview =  _.debounce(function(segment) {

        var content = segment.el.find('.editarea')
            .text()
            .replace(/\u00A0/g, ' ') // Non breaking space replaced
        ;

        if (content.length > 0) {
            var url = config.basepath +
                    'plugins/xmessage/preview?' +
                    $.param( { text : content, locale : config.target_rfc }) ;

            $.getJSON( url )
                .done( function(data) {
                    var container = segment.el.find('.target.item') ;
                    container.find('.xmessage-preview').remove();

                    var element = $('<p/>');
                    element.addClass('xmessage-preview');
                    element.text( data.preview );
                    container.append( element ) ;

                });
        }
    }, 300) ;

    $.extend(UI, {
        copySuggestionInEditarea : function() {
            return ;
        }
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


