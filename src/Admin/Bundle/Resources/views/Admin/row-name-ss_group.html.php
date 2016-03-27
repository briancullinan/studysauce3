<?php
use StudySauce\Bundle\Entity\Group;

/** @var Group $ss_group */
?>
<div class="group-name">
<label class="input">
    <span>Group name</span><br />
    <input type="text" name="name" value="<?php print $view->escape($ss_group->getName()); ?>"/>
</label>
<label class="input">
    <textarea name="description" placeholder="Description"><?php print $view->escape($ss_group->getDescription()); ?></textarea></label>
<span class="count"><?php print $ss_group->getPacks()->count(); ?></span>
</div>
