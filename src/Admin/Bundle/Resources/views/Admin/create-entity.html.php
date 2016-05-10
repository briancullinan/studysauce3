<?php

use Admin\Bundle\Controller\AdminController;

$view->extend('AdminBundle:Admin:dialog.html.php', ['id' => 'create-entity']);

$context = jQuery($this);
$dialog = $context->find('#create-entity');
$dialog->find('.tab-pane.active, li.active')->removeClass('active');
$dialog->find('.tab-pane,li')->hide();

$tableName = array_keys($tables)[0];

$view['slots']->start('modal-header'); ?>
    <h3>Create a new <?php print (ucfirst(str_replace('ss_', '', $tableName))); ?></h3>
<?php $view['slots']->stop();

if($tableName == 'pack') {
    $newPath = $view['router']->generate('packs_new');
}
if($tableName == 'ss_group') {
    $newPath = $view['router']->generate('groups_new');
}

$view['slots']->start('modal-body'); ?>
    <a href="<?php print ($newPath); ?>" class="cloak"><span class="reveal">Start from scratch</span></a>
    <a href="#add-entity" data-target="#add-entity" data-toggle="modal" class="cloak"><span class="reveal">Find existing <?php print (str_replace('ss_', '', $tableName)); ?>s</span></a>
<?php $view['slots']->stop();
