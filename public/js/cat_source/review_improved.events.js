
// TODO: move this into a specific file
//
// in memory database for MateCat
//

(function($, root, undefined) {
    var db = new loki('loki.json');
    var segments = db.addCollection('segments', { indices: ['sid']} ) ;
    segments.ensureUniqueIndex('sid');

    $(document).on('segments:load', function(e, data) {
        $.each(data.files, function() {
            $.each( this.segments, function() {
                var seg = segments.findOne( {sid : this.sid} );
                if ( seg ) {
                    var update = segments.update( this );
                }
                else {
                    var insert = segments.insert( this );
                }
            });
        });
    });

    root.MateCat = root.MateCat || {};
    root.MateCat.DB = db ;
    root.MateCat.DB.upsert = function(collection, record) {
        var c = this.getCollection(collection);
        if ( !c.insert( record ) ) {
            c.update( record );
        }
    }
    root.MateCat.Segments = segments ;

})(jQuery, window);

//
if ( Review.enabled() && Review.type == 'improved' ) {
(function($, UI, undefined) {

    var db = window.MateCat.DB;
    var versions = db.addCollection('segment_versions', {indices: [ 'id_segment']});
    versions.ensureUniqueIndex('id_segment');

    function showModalWindow(selection) {
        var data             = {};
        var range            = selection.getAllRanges()[0];

        data.start_offset  = range.startOffset ;
        data.end_offset    = range.endOffset ;

        data.selected_string = selection.toString() ;
        data.lqa_model       = JSON.parse( config.lqa_model ) ;

        var template = $( MateCat.Templates['review_improved/error_selection']( data ) );
        var modal = template.remodal({});

        template.on('keydown', function(e)  {
            var esc = 27 ;
            e.stopPropagation();
            if ( e.which == esc ) {
                modal.close();
            }
        });

        modal.open();
    }

    function overrideButtons() {
        var div = $('<ul>' + UI.segmentButtons + '</ul>');
        div.find('.translated').text('APPROVED')
            .removeClass('translated').addClass('approved');
        div.find('.next-untranslated').parent().remove();
        UI.segmentButtons = div.html();
    }



    $(document).on('mouseup', 'section.opened .errorTaggingArea', function(e) {
        var selection =  rangy.getSelection() ;
        if (
            selection.focusNode.parentNode.closest('.errorTaggingArea') &&
            selection.anchorNode.parentNode.closest('.errorTaggingArea') &&
            selection.toString().length > 0
        ) {
            showModalWindow( selection );
        }
    });

    $('html').on('buttonsCreation', 'section', function() {
        overrideButtons();
    });

    $(document).on('click', '.errorTaggingArea', function(e) {
        var section = $(e.target).closest('section') ;
        var segment = new UI.Segment( section );

        if ( UI.currentSegmentId != segment.id ) {
            UI.openSegment( segment );
            UI.scrollSegment( segment.el );
        }
    });

    $('html').on('footerCreation', 'section', function() {
        var div = $('<div>' + UI.footerHTML + '</div>');

        var data = { id: $(this).attr('id') };

        div.find('.submenu').append(
            $(MateCat.Templates['review_improved/review_tab']( data ))
        );

        div.append(
            $(MateCat.Templates['review_improved/review_tab_content'](data))
        );

        UI.footerHTML = div.html();
    });

    $(document).on('click', '.reviewImproved .tab-switcher-review', function(e) {
        e.preventDefault();

        $('.editor .submenu .active').removeClass('active');
        $(this).addClass('active');
        $('.editor .sub-editor.open').removeClass('open');
        if($(this).hasClass('untouched')) {
            $(this).removeClass('untouched');
            if(!UI.body.hasClass('hideMatches')) {
                $('.editor .sub-editor.review').addClass('open');
            }
        } else {
            $('.editor .sub-editor.review').addClass('open');
        }
    });

    $(document).on('submit', '#error-selection-form', function(e) {
        e.preventDefault();

        var form    = $( e.target );
        var segment = new UI.Segment( UI.currentSegment );
        var path  = sprintf('/api/v2/jobs/%s/%s/segments/%s/errors',
                  config.id_job, config.password, segment.id);


        var checked = form.find('input[type=radio]:checked').val() ;

        var id_category = checked.split('-')[0];
        var severity = checked.split('-')[1];
        var comment = form.find('textarea').val();

        var modelToSave = {
            // 'id_segment'          : segment.id,
            // 'id_job'              : config.id_job,
            'id_category'         : id_category,
            'severity'            : severity,
            // 'translation_version' : translation
            'start_position'      : form.find('input[name=start_offset]').val(),
            'stop_position'       : form.find('input[name=end_offset]').val(),
            // 'is_full_segment'     : $this->request->is_full_segment,
            // 'penalty_points'   : => $this->request->penalty_points,
            'comment'             : comment
        };

        console.log( modelToSave );

        $.post( path, modelToSave )
            .success(function( data ) {
                console.log('success', data );
            });

        return false;
    });

    $(document).on('click', '.reviewImproved .tabs-menu a', function(event) {
        event.preventDefault();

        $(this).parent().addClass("current");
        $(this).parent().siblings().removeClass("current");

        var section = $(event.target).closest('section');
        var tab = $(this).data("ref");

        console.log(tab);

        section.find('.tab-content').not(tab).css("display", "none");
        section.find(tab).show();

    });

    $( window ).on( 'segmentOpened', function ( e ) {
        var segment = new UI.Segment( $( e.segment ) );
        var versions_path  = sprintf('/api/v2/jobs/%s/%s/segments/%s/versions',
                  config.id_job, config.password, segment.id);

        var reviews_path = sprintf('/api/v2/jobs/%s/%s/segments/%s/reviews',
                   config.id_job, config.password, segment.id);

        $.getJSON( versions_path )
        .done(function( data ) {
            if ( data.versions.length ) {
                $.each( data.versions, function() {
                    MateCat.DB.upsert('segment_versions', this);
                });
            }
        }).complete(function() {
            updateVersionViews();
        });

        // $.getJSON( reviews_path ).done( function( data ) {
        //     if ( date.reviews.length ) {
        //         console.log( this );
        //     };
        // });
        // renderViews( segment );
        //
    });

    function renderViews(segment) {

    }

    function updateVersionViews( ) {
        var sid = UI.currentSegmentId ;
        console.log('currentSegmentId', sid );

        var original_target ;
        var segment = db.getCollection('segments').findOne({sid : sid});

        var data = { segment : segment };

        if ( parseInt(segment.original_target_provied) ) {
            var first_version = db.getCollection('segment_versions').findOne( {
                id_segment : sid,
                version_number : '0'
            });

            if ( !first_version ) {
                original_target = segment.translation ;
            } else {
                original_target = first_version.translation ;
            }

            data.original_target = UI.decodePlaceholdersToText(original_target) ;
        }

        var template = $(MateCat.Templates['review_improved/original_target']( data ));
        UI.Segment.findEl( segment.sid ).find('[data-mount=original-target]').html( template );
    }

    versions.on('update', updateVersionViews);
    versions.on('insert', updateVersionViews);

    $(document).on('click', 'a.approved', function(e) {
        e.preventDefault();

        UI.tempDisablingReadonlyAlert = true;
        UI.hideEditToolbar();

        UI.currentSegment.removeClass('modified');

        original = UI.currentSegment.find('.original-translation').text();

        $('.sub-editor.review .error-type').removeClass('error');

        UI.changeStatus(this, 'approved', 0);

        err = $('.sub-editor.review .error-type');
        err_typing = $(err).find('input[name=t1]:checked').val();
        err_translation = $(err).find('input[name=t2]:checked').val();
        err_terminology = $(err).find('input[name=t3]:checked').val();
        err_language = $(err).find('input[name=t4]:checked').val();
        err_style = $(err).find('input[name=t5]:checked').val();


        var data = {
            action: 'setRevision',
            job: config.id_job,
            jpassword: config.password,
            segment: UI.currentSegmentId,
            original: original,
            err_typing: err_typing,
            err_translation: err_translation,
            err_terminology: err_terminology,
            err_language: err_language,
            err_style: err_style
        };

        UI.openNextTranslated();

        UI.setRevision( data );

    });

})($, UI);
}