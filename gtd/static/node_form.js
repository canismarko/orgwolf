// enable or disable the timepicker objects
function timepicker_toggle(id_attr) 
{
    var checkbox = '#' + id_attr;
    var input = '#id_' + $("#" + id_attr).attr('toggles');
    var button = input + ' ~ span.add-on'
    if ($(checkbox).attr('checked') == 'checked')
    {
	$(input).removeAttr('disabled');
	$(button).removeClass('disabled');
    }
    else
    {
	$(input).attr('disabled', 'disabled');
	$(button).addClass('disabled');
    }
}
$(document).ready(function(){
    // Disable scheduled/deadline time input if checkbox is blank
    $('#id_scheduled_time_specific').click(function() {
	timepicker_toggle($(this).attr('id'))});
    $('#id_deadline_time_specific').click(function() {
	timepicker_toggle($(this).attr('id'))});
    timepicker_toggle('id_scheduled_time_specific');
    timepicker_toggle('id_deadline_time_specific');
    $('#id_scheduled_time').timepicker( {defaultTime: 'value',
					 showMeridian: false});
    $('#id_deadline_time').timepicker( {defaultTime: 'value',
					showMeridian: false});
    // Disable inputs for repeating information if checkbox is blank
    function repeating_toggle(selector) {
	if ($(selector).attr('checked') == 'checked') {
	    $('#id_repeating_number').removeAttr('disabled');
	    $('#id_repeating_unit').removeAttr('disabled');
	    $('#id_repeats_from_completion').removeAttr('disabled');
	} else {
	    $('#id_repeating_number').attr('disabled', 'disabled');
	    $('#id_repeating_unit').attr('disabled', 'disabled');
	    $('#id_repeats_from_completion').attr('disabled', 'disabled');
	}
    }
    $('#id_repeats').click(function() {
	repeating_toggle('#id_repeats');
    });
    repeating_toggle('#id_repeats');
});
