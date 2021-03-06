$(function() {
    $('.selectpicker').selectpicker();

    var get_sort_type = function() {
        sort_selected = $('#search-ordering').val()
        if (sort_selected == "By Age") {
            return "age"
        }
        throw "error!" 
    }

    var page_limit = 20;

    $('#search-ordering').on('change', function() {
        if ($('#abstract-view tbody')[0].children.length > 0) {
            $.getJSON('/abstracts?sort=' + get_sort_type() + '&limit=' + page_limit, function(data) {
                show_abstracts(data);
            });
        }
    });

var show_abstracts = function(data, currentPage) {
    currentPage = typeof currentPage != 'undefined' ? currentPage : 1;

    $('#abstract-view').empty();
        data.abstracts.forEach(function(html) {
            $('#abstract-view').append(html);
        });

        if (data.count > page_limit) {
            $('#paginator-wrapper').append('<div id="paginator"></div>');
            $('#paginator').bootstrapPaginator({
                currentPage: currentPage,
                totalPages: Math.ceil(data.count / page_limit),
                onPageChanged: function(event, oldPage, newPage) {
                    start = (newPage-1)*page_limit + 1;
                    $.getJSON('/abstracts?sort=' + get_sort_type() + '&limit=' + page_limit + '&start=' + start,
                      function(data) {
                       window.scrollTo(0, 0);
                       show_abstracts(data, newPage);
                   });
                }
            });
            $('#paginator ul').addClass('pagination');
        } else {
            $('#paginator-wrapper').empty();
        }

    $.getScript("annotator.js");
}

var load_facets = function(facets) {
    if (!facets) {
        $('#facets').empty();
    } else {
        if ($('#journal-facet-div').length == 0) {
            $('#facets').append(
                '<div id="journal-facet-div">' +
                '<h4 class="sidebar-header">Top Journals</h4>' +
                '<ul id="journal-facet-list" class="list-group facet-list"></ul>' +
                '</div>'
                );
        }

        $('#journal-facet-list').empty();
        facets.journals.forEach(function (journal) {
            var item = document.createElement('li');
            $(item).addClass('list-group-item')
            .text(journal.name)
            .prepend('<span class="badge">' + journal.count + '</span>');
            $(item).click(function() {
                if ($(item).hasClass('active')) {
                    $(item).removeClass('active');
                    $.ajax({
                        url: '/scope/set-facet/journal?q=none&sort=' + get_sort_type() + '&limit=' + page_limit,
                        type: 'PUT',
                        dataType: 'json',
                        success: function(data) {
                            show_abstracts(data);
                        }
                    });
                } else {
                    $('#journal-facet-list .list-group-item').removeClass('active');
                    $(item).addClass('active');
                    $.ajax({
                        url: '/scope/set-facet/journal?q=' + journal.name + '&sort=' + get_sort_type() + '&limit=' + page_limit,
                        type: 'PUT',
                        dataType: 'json',
                        success: function(data) {
                            show_abstracts(data);
                        }
                    });
                }
            });
$('#journal-facet-list').append(item);
});
}
}

var refine_scope = function(query) {
    $.ajax({
        url: '/scope/refine?q=' + query + '&sort=' + get_sort_type() + '&limit=' + page_limit,
        type: 'PUT',
        dataType: 'json',
        success: function(data) {
            load_facets(data.facets);
            show_abstracts(data);
        }
    });

    var remove_icon = document.createElement('span');
    $(remove_icon).addClass('glyphicon')
    .addClass('glyphicon-remove');

    var badge = document.createElement('span');
    $(badge).addClass('badge')
    .append(remove_icon);

    var item = document.createElement('li');
    $(item).addClass('list-group-item')
    .text(query)
    .prepend(badge);

    $(badge).click(function() {
        $.ajax({
            url: '/scope/generalize?q=' + query + '&sort=' + get_sort_type() + '&limit=' + page_limit,
            type: 'PUT',
            dataType: 'json',
            success: function(data) {
                $(item).remove();
                if (data.abstracts.length == 0) {
                    $('#abstract-view').empty();
                    $('#search-terms-header').remove();
                    $('#facets').empty();
                    $('#paginator-wrapper').empty();
                } else {
                    load_facets(data.facets);
                    show_abstracts(data);
                }
            }
        });
    });

    if ($('#search-terms-header').length == 0) {
        $('#search-terms').prepend('<h4 id="search-terms-header" class="sidebar-header">Search Scope</h4>')
    }

    $('#search-term-list').append(item);
};

terms = new Bloodhound({
    datumTokenizer: function(d) { return Bloodhound.tokenizers.whitespace(d); },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: 'http://localhost:8000/autocomplete/terms?q=%QUERY'
});

terms.initialize();

$('#search-box').typeahead({
    minLength: 2,
}, {
    source: terms.ttAdapter(),
    templates: {
        header: '<h4 class="autocomplete-header">Ontology Terms</h4>',
        suggestion: Handlebars.compile(
            '<p class="tt-term-count">{{count}}</p><p>{{term}}</p>'
            )
    }
    }/*, {
        source: some_other_autocomplete_section.ttAdapter(),
        templates: {
            header: '<h4 class="autocomplete-header">Some Other Autocomplete Section</h4>',
            suggestion: Handlebars.compile(
                '<p class="tt-term-count">{{count}}</p><p>{{term}}</p>'
            )
        }
    }*/).on('typeahead:selected', function(e, datum, name) {
        refine_scope(datum.term);
    }).on('keypress', function(e) {
        if (e.keyCode == 13) {
            refine_scope($(this).val());
        }
    });
});