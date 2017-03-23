<?php
use StudySauce\Bundle\Entity\User;
use Symfony\Bundle\FrameworkBundle\Templating\TimedPhpEngine;

/** @var $view TimedPhpEngine */
/** @var $user User */

$view->extend('StudySauceBundle:Shared:dashboard.html.php');

$view['slots']->start('stylesheets');

$view['slots']->stop();

$view['slots']->start('javascripts');

$view['slots']->stop();

$view['slots']->start('body'); ?>
<div class="panel-pane" id="privacy">
    <div class="pane-content">
        <h2>Privacy policy</h2>

        <h3>What information do we collect?</h3>

        <p>We collect information from you when you register on our site, place an order, subscribe to our newsletter,
            respond to a survey or fill out a form.&nbsp;<br><br>When ordering or registering on our site, as
            appropriate, you may be asked to enter your: name, e-mail address, mailing address, phone number or credit
            card information. You may, however, visit our site anonymously.<br><br>Google, as a third party vendor, uses
            cookies to serve ads on your site. Google's use of the DART cookie enables it to serve ads to your users
            based on their visit to your sites and other sites on the Internet. Users may opt out of the use of the DART
            cookie by visiting the Google ad and content network privacy policy.</p>

        <h3>What do we use your information for?</h3>

        <p>Any of the information we collect from you may be used in one of the following ways:&nbsp;<br><br>; To
            personalize your experience<br>(your information helps us to better respond to your individual
            needs)<br><br>; To improve our website<br>(we continually strive to improve our website offerings based on
            the information and feedback we receive from you)<br><br>; To improve customer service<br>(your information
            helps us to more effectively respond to your customer service requests and support needs)<br><br>; To
            process transactions</p>
        <blockquote><p>Your information, whether public or private, will not be sold, exchanged, transferred, or given
                to any other company for any reason whatsoever, without your consent, other than for the express purpose
                of delivering the purchased product or service requested.</p></blockquote>
        <p>; To administer a contest, promotion, survey or other site feature<br><br>; To send periodic emails</p>
        <blockquote><p>The email address you provide for order processing, may be used to send you information and
                updates pertaining to your order, in addition to receiving occasional company news, updates, related
                product or service information, etc.</p></blockquote>
        <p><br>Note: If at any time you would like to unsubscribe from receiving future emails, If at any time you would
            like to unsubscribe from receiving future emails, please contact us at <a
                href="mailto:support@studysauce.com">support@studysauce.com</a>.</p>

        <h3>How do we protect your information?</h3>

        <p>We implement a variety of security measures to maintain the safety of your personal information when you
            place an order or enter, submit, or access your personal information.&nbsp;<br><br>Do we use
            cookies?&nbsp;<br><br>Yes (Cookies are small files that a site or its service provider transfers to your
            computers hard drive through your Web browser (if you allow) that enables the sites or service providers
            systems to recognize your browser and capture and remember certain information<br><br>We use cookies to help
            us remember and process the items in your shopping cart, understand and save your preferences for future
            visits, keep track of advertisements and compile aggregate data about site traffic and site interaction so
            that we can offer better site experiences and tools in the future. We may contract with third-party service
            providers to assist us in better understanding our site visitors. These service providers are not permitted
            to use the information collected on our behalf except to help us conduct and improve our business.<br><br>If
            you prefer, you can choose to have your computer warn you each time a cookie is being sent, or you can
            choose to turn off all cookies via your browser settings. Like most websites, if you turn your cookies off,
            some of our services may not function properly. However, you can still place orders by contacting customer
            service.<br><br>Do we disclose any information to outside parties?&nbsp;<br><br>We do not sell, trade, or
            otherwise transfer to outside parties your personally identifiable information. This does not include
            trusted third parties who assist us in operating our website, conducting our business, or servicing you, so
            long as those parties agree to keep this information confidential. We may also release your information when
            we believe release is appropriate to comply with the law, enforce our site policies, or protect ours or
            others rights, property, or safety. However, non-personally identifiable visitor information may be provided
            to other parties for marketing, advertising, or other uses.<br><br>Third party links&nbsp;<br><br>Occasionally,
            at our discretion, we may include or offer third party products or services on our website. These third
            party sites have separate and independent privacy policies. We therefore have no responsibility or liability
            for the content and activities of these linked sites. Nonetheless, we seek to protect the integrity of our
            site and welcome any feedback about these sites.<br><br>California Online Privacy Protection Act
            Compliance<br><br>Because we value your privacy we have taken the necessary precautions to be in compliance
            with the California Online Privacy Protection Act. We therefore will not distribute your personal
            information to outside parties without your consent.<br><br>Childrens Online Privacy Protection Act
            Compliance&nbsp;<br><br>We are in compliance with the requirements of COPPA (Childrens Online Privacy
            Protection Act), we do not collect any information from anyone under 13 years of age. Our website, products
            and services are all directed to people who are at least 13 years old or older.<br><br></p>
        <h4>Terms and Conditions&nbsp;</h4>

        <p>Please also visit our Terms and Conditions section establishing the use, disclaimers, and limitations of
            liability governing the use of our website at&nbsp;<a href="<?php print $view['router']->generate('terms', [], true); ?>">www.studysauce.com/terms</a>.<br><br>
        </p>
        <h4>Your Consent&nbsp;</h4>

        <p>By using our site, you consent to our&nbsp;<a href="<?php print $view['router']->generate('privacy', [], true); ?>" target="_blank">privacy
                policy</a>.<br><br></p>
        <h4>Changes to our Privacy Policy&nbsp;</h4>

        <p>If we decide to change our privacy policy, we will post those changes on this page, and/or update the Privacy
            Policy modification date below<br>This policy was last modified on 8/30/2013<br><br></p>
        <h4>Contacting Us&nbsp;</h4>

        <p>If there are any questions regarding this privacy policy you may contact us using the information below.&nbsp;<br><br><a
                href="<?php print $view['router']->generate('_welcome', [], true); ?>">www.studysauce.com</a><br>19621 N 96th Pl<br>Scottsdale, Arizona
            85255<br>United States<br><a href="mailto:support@studysauce.com">support@studysauce.com</a><br>(480)
            331-8570<br></p>

        <div class="highlighted-link"><a href="<?php print $view['router']->generate('_welcome'); ?>" class="more">Go home</a></div>
    </div>
</div>
<?php $view['slots']->stop(); ?>
