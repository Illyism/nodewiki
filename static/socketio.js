var editor;

$(document).ready(function(){

  window.onbeforeunload = function() {
    return "You have attempted to leave this page. Are you sure?";
  };


  var rawMd, fileName;
  var editingAllowed = false; //dont allow editing until something is loaded

  var socket = io.connect();
  socket.on('connect', function(){
    socket.on('navLinks', function (data){
      $('#navigation').html(data.links);
      changeContentHeight();
    });

    ///////////////////////////////////////////////////////////
    // opening files and navigation
    ///////////////////////////////////////////////////////////
    var canSendReadFile = true;
    $(document).on('click', '#navigation a.link', function(a){
      if (canSendReadFile == true){
        canSendReadFile = false;
        socket.emit('readFile', {name: $(a.currentTarget).text()});
        $('#navigation').children().attr('class', 'link');
        $('#content #markdown_content').html('<em>Loading...</em>');
        $('#content #markdown_content').addClass('active');
        killEditor();
        $('#content_header h1').html('Knowledge Base');
        $(a.currentTarget).attr('class', 'selected link');
        changeContentHeight();

        if (creatingNewFile){
          cancelNewFile();
        }
      }
    });

    socket.on('readFileReply', function(data){
      canSendReadFile = true;
      if (data.error.error == true){
        console.warn('error: ' + data.error.reason);
        $('#notification').html('error reading file: ' + data.error.reason);
        $('#notification').slideDown('fast', function(){
          window.setTimeout(function(){$('#notification').slideUp()}, 7000);
        });
        $('#content #markdown_content').html('');
        changeContentHeight();
      } else {
        $('#content #markdown_content').html(data.fileContents);
        $('#content #markdown_content').addClass('active');
        killEditor();
        $('#content #content_header h1').html(data.fileName);
        rawMd = data.rawMd;
        fileName = data.fileName;
        editingAllowed = true;
        creatingNewFile = false;
        showButtons(true);
        changeContentHeight();
        $('#notification').slideUp();
      }
    });

    socket.on('readFolderReply', function(data){
      canSendReadFile = true;
      $('#content #markdown_content').html('');
      $('#content #markdown_content').addClass('active');
      killEditor();
      changeContentHeight();
      editingAllowed = false;
      creatingNewFile = false;
      showButtons(false);
    });

    $(document).on('click', '#navigation a#go_back', function(){
      socket.emit('goBackFolder');
      $('#content #markdown_content').html('');
      $('#content #markdown_content').addClass('active');
      killEditor();
      $('#content_header h1').html('Knowledge Base');
      //editingAllowed = true;
    })

    ///////////////////////////////////////////////////////////
    // saving files
    ///////////////////////////////////////////////////////////

    $(document).on('click', '#edit_save_buttons a#save', function(){
      if (editingAllowed == false){ //if user is currently editing
        if (creatingNewFile == true){
          if ($('#content #content_header input').val() != '' && editor.getValue() != ''){
            socket.emit('saveFile', {name: $('#content #content_header input').val(), content: editor.getValue()});
          } else {
            $('#notification').html('The title or the content cannot be empty. Also, the title needs to end with ".md"');
            $('#notification').slideDown('fast', function(){
              window.setTimeout(function(){$('#notification').slideUp()}, 4000);
            });
          }
        } else {
          socket.emit('saveFile', {name: fileName, content: editor.getValue()});
        }
      }
    });

    socket.on('saveFileReply', function(data){
      if (data.error.error == true){
        console.warn('there was an error saving');
        $('#notification').html('there was an error: ' + data.error.reason);
        $('#notification').slideDown('fast', function(){
          window.setTimeout(function(){$('#notification').slideUp()}, 7000);
        });
      } else {
        $('#content #markdown_content').html(data.fileContents);
        $('#content #markdown_content').addClass('active');
        killEditor();

        rawMd = data.rawMd;
        fileName = data.fileName;
        editingAllowed = true;
        changeContentHeight();
        $('#notification').html('Saved');
        $('#notification').slideDown('fast', function(){
          window.setTimeout(function(){$('#notification').slideUp()}, 2000);
        });

        if (creatingNewFile == true){
          creatingNewFile = false;
          $('#content #content_header h1').html(fileName);
          tempFile = '';
          socket.emit('refreshNav');
        }
      }
    });

    ///////////////////////////////////////////////////////////
    // editing files
    ///////////////////////////////////////////////////////////
    $(document).on('click', '#edit_save_buttons a#edit', function(){
      if (editingAllowed == true){
        editingAllowed = false;
        $('#content').height('auto');
        $('#content #markdown_content').html('');
        $('#content #markdown_content').removeClass('active');
        $('#content #editor').text(rawMd);
        $('#content #editor').addClass('active');
        editor = ace.edit("editor");
        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/markdown");
        editor.getSession().setUseSoftTabs(true);
        editor.getSession().setUseWrapMode(true);
      }
    });


    ///////////////////////////////////////////////////////////
    // creating new files
    ///////////////////////////////////////////////////////////
    var tempFile; // hold the <a> tag for the new file being created
    var creatingNewFile = false;

    $(document).on('click', '#navigation a#new_file', function(){
      fileName = '';
      rawMd = '';
      creatingNewFile = true;
      editingAllowed = false;

      $('#navigation #tri_buttons').before('<a href="#" class="link"><code>New File...</code></a>');
      tempFile = $('#navigation a.link:last');
      $('#navigation').children().attr('class', 'link');
      tempFile.attr('class', 'link selected');
      $('#navigation a#new_file').attr('id', 'new_file_inactive');
      $('#content #markdown_content').html('');
      $('#content #markdown_content').removeClass('active');

      $('#content #editor').html('# New File');
      $('#content #editor').addClass('active');
      editor = ace.edit("editor");
      editor.setTheme("ace/theme/monokai");
      editor.getSession().setMode("ace/mode/markdown");
      editor.getSession().setUseSoftTabs(true);
      editor.getSession().setUseWrapMode(true);

      $('#content #content_header h1').html('<form><input type="text" /></form>');
      $('#content #content_header input').focus();
      showButtons(true, true);
      changeContentHeight();
    });

    $(document).on('click', '#edit_save_buttons a#cancel', function(){
      cancelNewFile();
    });

    function cancelNewFile(){
      tempFile.remove();
      tempFile = '';
      creatingNewFile = false;
      editingAllowed = true;
      $('#content #markdown_content').html('');
      $('#content #markdown_content').addClass('active');
      killEditor();
      $('#content #content_header h1').html('Knowledge Base');
      $('#navigation a#new_file_inactive').attr('id', 'new_file');
      showButtons(false);
      changeContentHeight();
    }

    ///////////////////////////////////////////////////////////
    // creating new folder
    ///////////////////////////////////////////////////////////

    creatingNewFolder = false;
    $(document).on('click', '#navigation a#new_folder', function(){
      creatingNewFolder = true;
      fileName = '';
      rawMd = '';
      editingAllowed = false;

      if (creatingNewFile){
        cancelNewFile();
      }

      $('#content #content_header h1').html('Knowledge Base');
      $('#content #markdown_content').html('Creating new folder, press enter to create the folder');
      $('#navigation').children().attr('class', 'link');
      $('#navigation #tri_buttons').before('<div id="temp_new_folder"><form><input type="text" /></form></div>');
      tempFile = $('#navigation #temp_new_folder');
      $('#navigation input').focus();
      $('#navigation a#new_folder').attr('id', 'new_folder_inactive');
      $('#navigation #tri_buttons').html('<a href="#" id="cancel_folder">Cancel</a><a href="#" id="save_folder">Create Folder</a>');
      changeContentHeight();
    });

    $(document).on('click', '#navigation a#cancel_folder', function(){
      cancelNewFolder();
    });

    function createFolder(){
      if ($('#navigation input').val() != ''){
        socket.emit('newFolder', $('#navigation input').val());
        cancelNewFolder();
      } else {
        $('#notification').html('Please have at least 1 character for the folder name');
        $('#notification').slideDown('fast', function(){
          window.setTimeout(function(){$('#notification').slideUp()}, 4000);
        });
      }
    }

    $(document).on('click', '#navigation a#save_folder', function(){
      createFolder();
    });
    

    $('#navigation').submit(function(){
      createFolder();
    });
    

    function cancelNewFolder(){
      if (creatingNewFolder){
        creatingNewFolder = false;
        tempFile.remove();
        tempFile = '';
        $('#navigation #tri_buttons').html('');
        socket.emit('refreshNav');
        $('#content #markdown_content').html('');
        $('#content #markdown_content').addClass('active');
        killEditor();
        
      }
    }

    socket.on('newFolderReply', function(err){
      $('#notification').html('There was an error making the folder, error code: ' + err.code);
      $('#notification').slideDown('fast', function(){
        window.setTimeout(function(){$('#notification').slideUp()}, 4000);
      });
    });
   

  });
 

  ///////////////////////////////////////////////////////////
  // functions for the layout
  ///////////////////////////////////////////////////////////

  function showButtons(show, newFile){
    var buttons = '<a id="edit" href="#" title="Edit"><i class="fa fa-pencil"></i></a>\n<a id="save" href="#" title="Save"><i class="fa fa-save"></i></a>';
    if (show){
      if (newFile){
        $('#edit_save_buttons').html('<a id="cancel" href="#" title="Cancel"><i class="fa fa-close"></i></a>\n<a id="save" href="#" title="Save"><i class="fa fa-save"></i></a>');
      } else {
        $('#edit_save_buttons').html(buttons);
      }
    } else {
      $('#edit_save_buttons').html('');
    }
  }


  function changeContentHeight(){
    $('#content').height('auto');
    var offset = $('#content').offset();
    var contentBottom = $('#content').height() + offset.top;

    var offsetNav = $('#navigation').offset();
    var navBottom = $('#navigation').height() + offsetNav.top;

    if (navBottom > contentBottom){
      $('#content').css({"min-height":$('#navigation').height() + 20 + 'px'});
    }
  }

  function killEditor() {
    $('#content #editor').html('');
    $('#content #editor').removeClass('active');
    if (editor && editor.destroy) editor.destroy();
  }


});
