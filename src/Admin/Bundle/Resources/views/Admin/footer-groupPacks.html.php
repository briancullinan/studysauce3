<?php

use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Pack;

if(empty($results['pack'])) { ?>
    <div class="empty-packs">No packs in this group or all subgroups</div>
<?php
}
?>
<div class="highlighted-link form-actions <?php print $table; ?>">
    <form action="<?php print $view['router']->generate('save_group', [
        'groupId' => $results['ss_group'][0]->getId(),
        'groups' => ['id' => $results['ss_group'][0]->getId(), 'remove' => false]]); ?>">
    <?php
    print $this->render('AdminBundle:Admin:cell-collection.html.php', [
        'tables' => ['pack' => ['title','userCountStr','cardCountStr', 'id', 'status']],
        'entityIds' => !empty($results['pack']) ? array_map(function (Pack $p) {return $p->getId(); }, $results['pack']) : [],
        'dataConfirm' => false]);
    ?>
    <a href="#add-entity" title="Manage packs" data-target="#add-entity" data-toggle="modal" class="big-add"><span>+</span>&nbsp;</a>
    </form>
</div>

