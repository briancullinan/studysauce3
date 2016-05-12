<?php

use Admin\Bundle\Controller\AdminController;
use DateTime as Date;

$tableNames = array_keys($tables);

$view['slots']->start('cell-collection-create'); ?>
    <div class="entity-search <?php print (implode(' ', $tableNames)); ?>">
        <label class="input">
            <input type="text" name="<?php print (implode('_', $tableNames)); ?>" value=""
                   data-confirm="<?php print (!isset($dataConfirm) || $dataConfirm ? 'true' : 'false'); ?>" /></label>
    </div>
<?php $view['slots']->stop();


$view['slots']->start('cell-collection-header'); ?>
    <header>
        <label></label>
        <a href="#add-entity" class="big-add" data-toggle="modal" data-target="#add-entity">Add
            <span>+</span> individual</a>
    </header>
<?php $view['slots']->stop();



$context = !empty($context) ? $context : jQuery($this);
$search = $context->find('.entity-search');
if($search->length == 0) {
    $search = $context->append($view['slots']->get('cell-collection-create'))->find('.entity-search');
    $input = $search->find('.input > input');
}
else {
    $input = $search->find('.input > input');
}

if (isset($entities) && (!isset($inline) || $inline !== true)) {
    if ($search->find('header:not(.removed)')->length == 0) {
        jQuery($view['slots']->get('cell-collection-header'))->insertBefore($search->find('.input'));
    }
}

$entityIds = isset($entityIds) && is_array($entityIds) ? $entityIds : [];
$listIds = [];
$dataTypes = (array)(new stdClass());
$removedEntities = isset($removedEntities) && is_array($removedEntities) ? $removedEntities : [];
if (isset($entities)) {
    foreach ($entities as $entity) {
        $dataEntity = AdminController::toFirewalledEntityArray($entity, $tables);
        if(in_array($entity, $removedEntities)) {
            $dataEntity['removed'] = true;
        }
        if(!isset($dataEntity['removed'])) {
            $dataEntity['removed'] = false;
        }
        $key = concat($dataEntity['table'] , '-' , $dataEntity['id']);
        $table = $dataEntity['table'];
        $listIds[count($listIds)] = $key;
        $unsetId = array_search($key, $entityIds);
        if (!$dataEntity['removed'] && $unsetId === false) {
            $entityIds[count($entityIds)] = $key;
        }
        else if ($dataEntity['removed'] && $unsetId !== false) {
            array_splice($entityIds, $unsetId, 1);
        }
        if(!isset($dataTypes[$table])) {
            // TODO: fix this syntax in JS
            $dataTypes[$table] = [];
        }
        $dataTypes[$table][count($dataTypes[$table])] = $dataEntity;

        // if we are dealing with a list of entities

        if (isset($entities) && (!isset($inline) || $inline !== true)) {
            $newRow = jQuery($view->render('AdminBundle:Admin:cell-collectionRow.html.php', ['entity' => $dataEntity, 'tables' => $tables]));
            $newRow->find('input[name*="[remove]"]')->val($dataEntity['removed'] ? 'true' : 'false');
            $newRow->find('input[name*="[id]"]')->attr('checked', 'checked');
            $existing = $search->children('.checkbox')->find(implode('', ['input[name^="' , $table , '["][value="' , $dataEntity['id'] , '"]']));
            if($existing->length > 0) {
                $existing->parents('.checkbox')->remove();
            }
            // insert under the the right heading
            if($dataEntity['removed']) {
                if ($search->find('header.removed')->length == 0) {
                    jQuery($view['slots']->get('cell-collection-header'))
                        ->insertBefore($search->find('.input'))
                        ->addClass('removed');
                }
                $newRow->insertAfter($search->find('header.removed'));
            }
            else {
                if ($search->find('header:not(.removed)')->length == 0) {
                    jQuery($view['slots']->get('cell-collection-header'))->insertBefore($search->find('.input'));
                }
                $newRow->insertAfter($search->find('header:not(.removed)'));
            }
        }
    }
}

$headerTitle = '';
$placeHolder = '';
foreach ($tableNames as $t) {
    $headerTitle = implode('', [$headerTitle, !empty($headerTitle) ? '/' : '', (isset($dataTypes[$t])
        ? count($dataTypes[$t])
        : 0), ' ', str_replace('ss_', '', $t), 's']);

    $placeHolder = concat((!empty($placeHolder) ? '/' : ''), ucfirst(str_replace('ss_', '', $t)));
}
$placeHolder = concat('Search for ', $placeHolder);
// some final tweak to the input field
$input->attr('placeholder', $placeHolder);

// if its inline, update header counts
if (isset($entities) && (!isset($inline) || $inline !== true)) {
    $header = $search->find('header:not(.removed)');
    $headerTitle = concat('Members (', $headerTitle, ')');
    $header->find('label')->text($headerTitle);
    $search->find('header.removed label')->text('Removed');
    //if($search->find('header:not(.removed) ~ .checkbox')->length == 0 ||
    //    $search->find('header:not(.removed) + header')->length > 0) {
    //    $search->find('header:not(.removed)')->remove();
    //}
    if($search->find('header.removed ~ .checkbox')->length == 0 ||
        $search->find('header.removed + header')->length > 0) {
        $search->find('header.removed')->remove();
    }
}

// this is the update stuff that we do every time the template is called

$entityIds = array_values($entityIds);
//$input->val(isset($inline) && $inline === true ? implode(' ', $listIds) : '');
// force it to use string keys
$input->data('tables', $tables)
    ->data('oldValue', '')
    ->data('entities', $entityIds)
    ->attr('data-tables', json_encode($tables))
    ->attr('data-entities', json_encode($entityIds));
foreach ($tableNames as $t) {
    $types = isset($dataTypes[$t]) ? $dataTypes[$t] : [];
    $input->data($t, $types)
        ->attr(concat('data-' , $t), json_encode($types));
}

/*
 * TODO: merge this with template scripts if we need inline version
function updateRows (toField, value, item) {
    isSettingSelectize = true;
    var tableName = value.split('-')[0];
    var existing = (toField.data('entities') || []);
    var existingEntities = toField.data(tableName) || [];
    var oldValue = toField.val().split(' ');
    var valueField = toField[0].selectize.settings.valueField;
        var entity;
        if((entity = existingEntities.filter(function (e) {return e[valueField] == item[valueField]})).length > 0) {
            entity[0].remove = item.remove;
        }
        else {
            existingEntities[existingEntities.length] = item;
        }
        if (item.remove) {
            existing = existing.filter(function (i) {return i != item[valueField]});
            oldValue = oldValue.filter(function (i) {return i != item[valueField]});
        }
        else {
            if(existing.indexOf(item[valueField]) == -1) {
                existing[existing.length] = item[valueField];
            }
            if(oldValue.indexOf(item[valueField]) == -1) {
                oldValue[oldValue.length] = item[valueField];
            }
        }
        toField.data('oldValue', oldValue.join(' '));
        toField.data('entities', existing);
        toField.data(tableName, existingEntities);
        isSettingSelectize = false;
    }
*/

print ($context->html());


