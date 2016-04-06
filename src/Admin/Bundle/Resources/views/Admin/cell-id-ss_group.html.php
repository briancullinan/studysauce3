<?php
use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Pack;
use StudySauce\Bundle\Entity\User;

/** @var Group $ss_group */
$time = method_exists($ss_group, 'getModified') && !empty($ss_group->getModified()) ? $ss_group->getModified() : $ss_group->getCreated();
?>
<div class="pack-icon">
    <?php if (empty($ss_group->getLogo())) {
        foreach ($view['assetic']->image(['@StudySauceBundle/Resources/public/images/upload_image.png'], [], ['output' => 'bundles/studysauce/images/*']) as $url): ?>
            <img width="300" height="100" src="<?php echo $view->escape($url) ?>" class="default" alt="Upload"/>
        <?php endforeach;
    } else { ?><img height="50" src="<?php print $ss_group->getLogo()->getUrl(); ?>" /><?php } ?><br/>
    <a href="#upload-image" data-target="#upload-file" data-toggle="modal"> Image</a>
</div>