
if (true)
(function($, UI, undefined) {

    var askForPreview = function(segment) {
        var content = segment.el.find('.editarea').text() ;

        if (content.length == 0) {

        }
    }

    $.extend(UI, {
        copySuggestionInEditarea : function() {
            return ;
        }
    });

    $(window).on('segmentOpened', function(e) {
        askForPreview( e.segment ) ;
    });

    $(document).on('targetTextChanged', function(e, data) {
        console.log(' text changed ', data.segment.el.find('.editarea').text() );
    });

})(jQuery, UI);


