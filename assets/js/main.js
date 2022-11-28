var input = document.querySelector('input');
var validTokenTextArea = $('.valid-tokens')[0];
var addTokenInput = $('.add-token-input')[0];
var addTokenButton = $('.add-token-button')[0];
var validateTokensTextArea = $('.validate-tokens')[0];
var sugestions = $('.sugestion-line')[0];
var automatoTableBody = $('.automato-body')[0];
var divToScroll = $(".body-column.body-right-column");

var arrowCodes = [37, 38, 19, 40];
var mouseCodes = [3, 2, 1];
var enterCode = 13;
var endLineCode = 10;
var spaceCode = 32;
var backspaceCode = 8;

var reset = function (e)
{
    var keyCode = (e.which) ? e.which : e.keyCode;

    if (arrowCodes.indexOf(keyCode) > -1) {
        e.preventDefault();
    } else if (keyCode == undefined) {
        e.preventDefault();
    }

    if(e.ctrlKey || e.altKey) {
        e.preventDefault();
        return;
    }

    /*if (mouseCodes.indexOf(keyCode) > -1) {
        event.preventDefault();
        return false;
    }*/
    var len = this.value.length;
    this.setSelectionRange(len, len);

    if (e.type=="keydown") {
        if (keyCode<=90 && keyCode>=48) {
            AutomatoManager.validateEntry(e.key.toLowerCase(), true);
        } else if (keyCode==enterCode || keyCode==spaceCode || keyCode==backspaceCode) {
            AutomatoManager.validateEntry(keyCode, true);
        }
    }
};

var checkForAddTokenSubmit = function (e)
{
    var keyCode = (e.which) ? e.which : e.keyCode;
    if (keyCode == enterCode) {
        DisplayManager.addToken();
    }
}

var doNothing = function(e)
{
    e.preventDefault();
    return false;
};

validateTokensTextArea.addEventListener('keyup', reset, true);
validateTokensTextArea.addEventListener('keydown', reset, true);
validateTokensTextArea.addEventListener('mouseup', doNothing, true);
validateTokensTextArea.addEventListener('mousedown', reset, true);
validateTokensTextArea.addEventListener('contextmenu', doNothing, true);
validateTokensTextArea.addEventListener('dblclick', doNothing, true);

addTokenInput.addEventListener('keydown', checkForAddTokenSubmit, true);

//HTMLs
var automatoHeader = $('#automatoHeader');
var automatoRow = '<tr id="STATE_ID" class="automato-row" IS_TERMINAL_TITLE>COLUMNS</tr>'
var automatoRowTitle = '<th id="STATE_ID-id" class="automato-column-id">IS_TERMINALSTATE_ID</th>'
var automatoCell = '<td id="STATE_ID-LETTER" class="automato-cell">-</td>'
//HTMLs end

var DisplayManager =
{
    updateEntrySugestions: function ()
    {
        var entrySugestionsIterator = AutomatoManager.getEntrySugestions();
        var entrySugestions = [];

        var sugestion = entrySugestionsIterator.next().value;
        while (sugestion!=undefined)
        {
            entrySugestions.push(sugestion);
            sugestion = entrySugestionsIterator.next().value;
        }

        entrySugestions.sort();

        var sugestionsHtml = '';
        if (entrySugestions.length>0) {
            sugestionsHtml = entrySugestions[0];
        }

        for (var i=1; i<entrySugestions.length; i++) {
            sugestionsHtml+=(' - '+entrySugestions[i]);
        }
        sugestions.innerHTML=sugestionsHtml;
    },

    addToken: function()
    {
        var tokensToAdd = $('.add-token-input')[0].value.split(' ');
        for (var i=0; i<tokensToAdd.length; i++) {
            Vocabulary.addToken(tokensToAdd[i].replace(/[^a-z]/gi, ''));
        }
        $('.add-token-input')[0].value = '';
    },

    addStateRow: function (state)
    {
        var cellHtml;
        var rowHtml = automatoRow;
        var rowContentHtml = automatoRowTitle;
        rowHtml = rowHtml.replace(/IS_TERMINAL_TITLE/g, ((state.isTerminal)?'title="Estado terminal"':''));
        rowContentHtml = rowContentHtml.replace(/IS_TERMINAL/g, ((state.isTerminal)?'*':''));

        for (var i=65; i<=90; i++) {
            cellHtml = automatoCell.replace(/LETTER/g, String.fromCharCode(i).toLowerCase());
            rowContentHtml+=cellHtml;
        }
        rowHtml = rowHtml.replace(/COLUMNS/g, rowContentHtml);
        rowHtml = rowHtml.replace(/STATE_ID/g, state.id);
        automatoTableBody.innerHTML+=rowHtml;
    },

    addStateTransition: function (previousStateCode, entryChar, nextStateCode)
    {
        var query = '#'+previousStateCode+'-'+entryChar;
        $(query)[0].innerHTML = nextStateCode;
    },

    scrollTableToState: function ()
    {
        if (AutomatoManager.actualStateCode!='error') {
            var scrollUntilState = $('#'+AutomatoManager.actualStateCode);
            divToScroll.scrollTop(
                scrollUntilState.offset().top - divToScroll.offset().top + divToScroll.scrollTop()
            );
        }
    },

    updateValidTokens: function (validTokens) {
        validTokens.sort();
        validTokenTextArea.value = '-'+validTokens[0];
        for (var i=1; i<validTokens.length; i++) {
            validTokenTextArea.value += ('\n-'+validTokens[i]);
        }
    },

    updateHighlightedState: function(previousStateCode, actualStateCode) {
        var previousStateRow = document.getElementById(previousStateCode);
        var actualStateRow = document.getElementById(actualStateCode)

        if (previousStateRow!=undefined){
            previousStateRow.className='automato-row';
        }
        if (actualStateRow!=undefined){
            actualStateRow.className+=' actual-state';
        }
        if (AutomatoManager.actualStateCode=="error") {
            validateTokensTextArea.className+=" error";
        } else {
            validateTokensTextArea.className="text-area validate-tokens";
        }
    }
};

function State (id) {
    this.id = id,
    this.isTerminal = false,
    this.isInitial = false,
    this.transitions = new Map()
};

var Vocabulary = {
    tokens: [],
    addToken: function (token)
    {
        if (!(token!='' && token!=undefined && token!=null)) {
            return;
        }
        token = token.toLowerCase();
        if (!(this.tokens.indexOf(token) > -1)) {
            this.tokens.push(token);
            DisplayManager.updateValidTokens(this.tokens);
            AutomatoManager.addToken(token);
        }
    }
};

var AutomatoManager =
{
    stateIdCounter: 0,
    stateMap: new Map(),//Map key >> String state.id, value >> State state
    stateStack: ['q0'], //Array like pile, last in first out >> for backtracking
    actualStateCode: '',

    getStateMap: function ()
    {
        return this.stateMap;
    },

    getNewId: function ()
    {
        return 'q'+(++this.stateIdCounter);
    },

    createInitialState: function (initialStateCode)
    {
        if(initialStateCode==undefined || initialStateCode=='') {
            initialStateCode = 'q0';
        }
        initialState = new State(initialStateCode);
        initialState.isInitial = true;
        initialState.isTerminal = true;
        this.stateMap.set(initialStateCode, initialState);
        this.actualStateCode = 'q0';
    },

    createNewState: function (isTerminal) {
        newState = new State(this.getNewId());
        newState.isTerminal = isTerminal;
        this.stateMap.set(newState.id, newState);
        DisplayManager.addStateRow(newState);
        return newState;
    },

    getStateFromTransition: function(previousStateCode, entryChar)
    {
        var trnState = this.stateMap.get(previousStateCode);
        if (trnState!=undefined && trnState!=null) {
            return trnState.transitions.get(entryChar);
        } else {
            return undefined;
        }
    },

    createNewStateForTransition: function (previousStateCode, entryChar, isTerminalBoolean)
    {
        newState = this.createNewState(isTerminalBoolean);
        this.stateMap.get(previousStateCode).transitions.set(entryChar, newState.id);
        DisplayManager.addStateTransition(previousStateCode, entryChar, newState.id);
        return newState.id;
    },

    setStateAsTerminal: function(stateId)
    {
        this.stateMap.get(stateId).isTerminal = true;
    },

    addState: function (previousStateCode, entryChar, isTerminalBoolean) //return state.id
    {
        /*params: (state.id, char, boolean)*/
        if (this.stateMap.get(previousStateCode)==undefined) { //if dosn't exist a initial state, create one!
            this.createInitialState(previousStateCode);
        }

        var auxStateCode = this.getStateFromTransition(previousStateCode, entryChar);
        if (auxStateCode==undefined || auxStateCode==null) {
            auxStateCode = this.createNewStateForTransition(previousStateCode, entryChar, isTerminalBoolean);
        } else {
            if (isTerminalBoolean) {
                this.setStateAsTerminal(auxStateCode);
            }
        }
        return auxStateCode;
    },

    addToken: function (token)
    {
        var tempStateCode = 'q0'; //Initial State
        var entryChar = '';
        for (var i=0; i<token.length; i++) {
            entryChar = token[i];
            tempStateCode = this.addState(tempStateCode, entryChar, (i==token.length-1));
        }
        this.revalidateCurrentState();
    },

    createErrorState: function() {
        newState = new State('error');
        newState.isTerminal = false;
        this.stateMap.set('error', newState);
    },

    validateEntry: function(entryChar, shouldAnimate)
    {
        var isBacktracking = false;
        var previousStateCodeForAnimate = this.actualStateCode;

        if (entryChar==enterCode || entryChar==spaceCode) {
            var actualState = this.stateMap.get(this.actualStateCode);
            if (actualState.isTerminal) {
                this.actualStateCode = 'q0';
            } else {
                this.actualStateCode = 'error';
            }
        } else if (entryChar==backspaceCode) {
            if (this.stateStack.length-1>0) {
                this.stateStack.pop();
                this.actualStateCode = this.stateStack[this.stateStack.length-1];
            }
            isBacktracking = true;
        } else {
            this.actualStateCode = this.getStateFromTransition(this.actualStateCode, entryChar);
            if (this.actualStateCode == undefined) {
                this.actualStateCode = 'error';
                if (this.stateMap.get(this.actualStateCode)==undefined) { //if dosn't exist a error state, create one!
                    this.createErrorState();
                }
            }
        }
        if (!isBacktracking) {
            this.stateStack.push(this.actualStateCode);
        }
        if (shouldAnimate) {
            DisplayManager.updateEntrySugestions();
            DisplayManager.updateHighlightedState(previousStateCodeForAnimate, this.actualStateCode);
            DisplayManager.scrollTableToState();
        }
    },

    clearInputValidator: function ()
    {
        validateTokensTextArea.value = '';
        this.actualStateCode = 'q0';
    },

    revalidateCurrentState: function ()
    {
        var inputs = validateTokensTextArea.value.toLowerCase();
        this.stateStack = ["q0"];
        this.actualStateCode = 'q0';
        var entryKey;
        var entryKeyCode;
        for (var i=0; i<inputs.length; i++) {
            entryKey = inputs[i];
            entryKeyCode = entryKey.charCodeAt(0);
            if (entryKeyCode==10 || entryKeyCode==enterCode) {
                entryKey = enterCode;
            } else if (entryKeyCode==32 || entryKeyCode==spaceCode) {
                entryKey = spaceCode;
            }
            var shouldAnimate = (i==inputs.length-1);
            this.validateEntry(entryKey, shouldAnimate);
        }
        DisplayManager.updateEntrySugestions();
    },

    getEntrySugestions: function ()
    {
        var sugestions = this.stateMap.get(this.actualStateCode).transitions.keys();
        return sugestions;
    }
};

AutomatoManager.createInitialState();
AutomatoManager.createErrorState();

addTokenButton.addEventListener("click", DisplayManager.addToken(), true);
