<?php
$entityIds = isset($entityIds) && is_array($entityIds) ? $entityIds : [];
$dataTypes = [];
if (isset($entities)) {
    foreach ($entities as $u) {
        $type = gettype($u);
        $ti = array_search($type, \Admin\Bundle\Controller\AdminController::$allTableClasses);
        $joinTable = \Admin\Bundle\Controller\AdminController::$allTableMetadata[$ti]->table['name'];
        $entityIds[] = $joinTable . '-' . $u->getId();
        $dataTypes[$joinTable][] = [
            'table' => $joinTable,
            'value' => $joinTable . '-' . $u->getId(),
            'text' => $u->{'get' . ucfirst($tables[$joinTable][0])}() . ' ' . $u->{'get' . ucfirst($tables[$joinTable][1])}(),
            0 => $u->{'get' . ucfirst($tables[$joinTable][2])}()
        ];
    }
}
?>

<div class="entity-search <?php print implode(' ', array_keys($dataTypes)); ?>">
    <label class="input">
        <input type="text" name="<?php print implode('_', array_keys($tables)); ?>" value=""
               placeholder="Search for <?php print implode('/', array_map(function ($t) {
                   return ucfirst(str_replace('ss_', '', $t));
               }, array_keys($tables))); ?>"
            <?php
            foreach ($dataTypes as $t => $options) {
                print ' data-' . $t . '="' . $view->escape(json_encode($options)) . '"';
            }
            if (isset($entities)) { ?>
                data-entities="<?php print $view->escape(json_encode($entityIds)); ?>"
            <?php } ?>
                data-tables="<?php print $view->escape(json_encode($tables)); ?>"/></label>
    <?php
    if (isset($entities)) {
        $i = 0;
        foreach ($entities as $u) {
            $type = gettype($u);
            $ti = array_search($type, \Admin\Bundle\Controller\AdminController::$allTableClasses);
            $joinTable = \Admin\Bundle\Controller\AdminController::$allTableMetadata[$ti]->table['name'];
            ?>
            <label class="checkbox buttons-1">
                <input type="checkbox" name="<?php print implode('_', array_keys($tables)); ?>[<?php print $i; ?>][id]"
                       value="<?php print $u->getId(); ?>"
                       checked="checked"/>
                <i></i>
                <span><?php print $u->{'get' . ucfirst($tables[$joinTable][0])}() . ' ' . $u->{'get' . ucfirst($tables[$joinTable][1])}(); ?></span>
                <a href="#subtract-entity" title="Remove"></a>
            </label>
            <?php $i++;
        } ?>

        <label class="checkbox template">
            <input type="checkbox" name="<?php print implode('_', array_keys($tables)); ?>[{i}][id]" value="{value}"
                   checked="checked"/>
            <i></i>
            <span>{<?php print implode('_', array_keys($tables)); ?>}</span>
            <a href="#insert-entity" title="Add"></a><a href="#subtract-entity" title="Remove"></a>
        </label>

    <?php } ?>
</div>