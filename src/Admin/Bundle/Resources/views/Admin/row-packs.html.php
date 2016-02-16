<?php
use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Pack;
use StudySauce\Bundle\Entity\User;

/** @var User|Group $entity */
?>

<div>
    <label class="input"><input type="text" name="packs" value="" placeholder="Any Pack / Id" /></label>
    <?php
    print implode(', ', array_map(function (Pack $p) { return $p->getTitle(); }, $entity->getPacks()->slice(0, 5)));
    if ($entity->getPacks()->count() > 5) {
        print ' <a href="#search-' . $table . ':' . $entity->getId() . '">+' . ($entity->getPacks()->count() - 5) . ' more</a>';
    }
    ?>
</div>