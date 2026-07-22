-- Adds complete English and French editions of the 36 editorial articles.
-- The rows share category + sortOrder with the Portuguese source so the UI
-- can keep the same article open when the reader changes language.

CREATE TEMP TABLE "guide_editorial_translations" (
  "locale" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "category" "GuideCategory" NOT NULL,
  "sortOrder" INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO "guide_editorial_translations" VALUES
('en', 'en-consent-is-an-ongoing-conversation', 'Consent is not a signed contract: it is an ongoing conversation', 'A yes only matters while it remains free, informed, specific and current. Asking, listening and stopping are part of intimacy, not interruptions to it.', $en101$Consent is not the absence of a no. It is the visible presence of a free and shared willingness. This distinction changes the responsibility: nobody should have to resist; everyone involved should check that genuine willingness exists.

Healthy consent is **freely given**, **informed**, **specific**, **reversible** and **current**. Agreeing to talk, kiss or meet does not authorise the next step. Sharing a private photograph does not authorise saving or forwarding it. A match only means that contact may begin. A relationship or previous intimacy never creates permanent permission.

### Check without turning intimacy into an interview

Simple questions work: “Would you like to continue?”, “Is this comfortable?” or “May I?”. A question is real only when both answers are safe. Silence, freezing, pulling away, hesitation or suddenly becoming passive are reasons to stop and check. Uncertainty is never permission.

Alcohol and other substances make this assessment harder. Someone who is severely impaired, disoriented, unconscious or unable to understand what is happening cannot give valid consent.

### Put it into practice

Check in at transitions: from conversation to touch, from a public place to a private one, or from one activity to another. If enthusiasm disappears, return to the last clear boundary. The purpose is not to obtain a more convincing yes; it is to make a pressure-free decision possible.

**Take this with you:** asking is maturity, stopping is respect, and changing one’s mind is a right.$en101$, 'CONSENT', 101),
('en', 'en-talk-before-desire-speeds-up', 'Talk before desire speeds up: boundaries, expectations and clear signals', 'The best conversations about boundaries happen before thinking becomes difficult. Preparation does not remove spontaneity; it removes dangerous ambiguity.', $en102$As attraction rises, calm negotiation often becomes harder. Talking before a meeting or intimate experience is therefore not bureaucracy. It creates the conditions in which spontaneity can remain safe.

Separate three areas. **Yes** includes what you genuinely want. **Maybe** covers what depends on trust, context, pace or specific conditions. **No** contains limits that are not open to negotiation now. These areas can change, but never through exhaustion: asking repeatedly until someone gives in is pressure, not negotiation.

Discuss practical expectations as well as activities: who will be present, what information may be shared, safer-sex choices, photographs, alcohol, sleeping arrangements, transport and how anyone can pause or leave. Couples should each speak for themselves; a joint profile does not erase two individual voices.

### Make stopping easy

Agree on plain language such as “pause” or “stop”. A signal is useful only if everyone responds immediately and without punishment. Also name quieter signs: withdrawing, going silent or losing participation should trigger a check-in.

Afterwards, review what felt good, what did not and what should change. Do not negotiate while somebody is flooded, embarrassed or afraid of disappointing others.

**Take this with you:** boundaries said early protect desire later. A clear no reduces guesswork; a thoughtful maybe identifies the conditions required for a genuine yes.$en102$, 'CONSENT', 102),
('en', 'en-pressure-in-disguise', 'Pressure in disguise: recognising coercion, guilt and apparent consent', 'Coercion is not always loud. Repetition, emotional debt, fear of conflict and unequal power can produce a yes that is not truly free.', $en103$Pressure is often presented as affection, disappointment or logic: “If you trusted me…”, “We came all this way”, “Everyone else agreed”, or repeated requests after a refusal. The words may sound calm while the choice becomes unsafe.

Apparent consent can emerge from fear of losing a relationship, financial dependence, a large power imbalance, intoxication, being isolated from transport, or the wish to end relentless negotiation. A spoken yes does not repair conditions in which saying no carries a penalty.

### Warning signs

- A boundary is treated as a challenge to overcome.
- Someone sulks, threatens to leave or withdraws affection after a no.
- A couple forms a united front against a third person.
- New details appear only after the person is already committed or isolated.
- “Maybe” and silence are repeatedly translated into agreement.

If you notice these patterns, slow down. Restore practical freedom: offer transport, privacy, time and a real exit. Do not demand an immediate explanation. If you applied pressure, acknowledge the specific behaviour, stop, and accept that trust may not return on your preferred schedule.

### A useful test

Ask: “Could this person refuse without fearing punishment, humiliation, financial loss or abandonment?” If the answer is no, the conditions need to change before intimacy continues.

**Take this with you:** consent is measured not only by how easily someone can say yes, but by how safely they can say no.$en103$, 'CONSENT', 103),
('en', 'en-when-something-goes-wrong', 'When something goes wrong: stop, repair and take responsibility', 'A crossed boundary requires immediate safety, honest accountability and change. Good intentions do not cancel impact.', $en104$When someone says that a boundary was crossed, the first task is not to defend your intentions. Stop the activity, create distance if requested and check immediate safety. The affected person decides whether they want conversation, support, transport, medical care or no further contact.

Avoid reflexes such as “I misunderstood”, “You did not say no” or “That is not what I meant”. These statements centre the person who caused harm and force the other to prove their experience. Intent may matter later, but it does not erase impact.

### What accountability looks like

Name what you did without euphemism. Acknowledge the effect you were told about. Apologise without asking for forgiveness, and explain what concrete behaviour will change. Respect any request for space, blocking or reporting. Repair cannot be demanded from the person who was hurt.

If you are the person affected, prioritise your own needs. Write down what happened while memory is fresh, keep relevant messages, contact someone you trust and use the platform’s block and report tools. Seek specialist or emergency support when appropriate.

Couples should not close ranks to protect their shared image. Each person remains responsible for their own conduct, and a third person deserves the same credibility and care.

**Take this with you:** repair begins with stopping and believing the boundary, not with winning an argument about intentions.$en104$, 'CONSENT', 104),

('en', 'en-are-we-really-ready', 'Are we really ready? The test before inviting another person', 'A third person cannot fix a relationship that avoids its own conflicts. Readiness means shared desire, room for a no and care for the person invited.', $en201$Inviting another person can amplify curiosity and connection, but it also amplifies cracks that already exist. Readiness is not measured by excitement alone. It requires a stable ability to disagree, pause and remain kind when reality differs from fantasy.

Each partner should answer separately: Do I want this for myself, or to avoid losing the relationship? Can I hear my partner express attraction without retaliating? Can either of us stop the plan without punishment? Are we able to offer the invited person agency rather than a role written in advance?

### Conditions worth checking

- The relationship is not using the experience to repair betrayal or acute conflict.
- Both partners can communicate directly instead of appointing one spokesperson.
- Safer-sex, privacy, overnight plans and contact afterwards have been discussed.
- The third person can set boundaries, change their mind and build or decline individual connections.
- There is a plan for jealousy that does not involve controlling somebody else.

Run a low-stakes rehearsal: talk through a realistic scenario in which attraction is uneven, one partner wants to stop, or the invited person prefers one of you. Notice whether curiosity survives discomfort.

Postponing is not failure. Sometimes the mature outcome of a readiness conversation is “not yet”.

**Take this with you:** do not invite a real person into a fantasy until you are prepared to respect their real preferences, limits and emotions.$en201$, 'COUPLES', 201),
('en', 'en-jealousy-in-a-couple', 'Jealousy in a couple: emotional information, not a command', 'Jealousy can reveal fear, comparison or unmet needs. It deserves attention, but it does not automatically authorise control.', $en202$Jealousy is a bundle rather than a single emotion. It may contain fear of replacement, loss of status, shame, envy, uncertainty or an unmet need for reassurance. Treating it as information makes it possible to respond without letting it govern everyone else.

Start with precision. “I am jealous” is less useful than “When you kept messaging after our agreed time, I feared our agreement no longer mattered.” Describe the event, the story your mind created and the need underneath it. The goal is understanding, not proving that the emotion is irrational.

### Regulation before rules

Pause major decisions while highly activated. Breathe, move, write, speak to a trusted person and return when the body is calmer. Ask for care that you and your partner can actually provide: a check-in time, clearer scheduling or affectionate reconnection. Avoid solutions that remove another person’s autonomy simply to end discomfort.

Jealousy does not make someone immature, and feeling compersion is not a compulsory achievement. Emotions can coexist: happiness for a partner and fear for oneself may both be true.

After the immediate wave, review whether an agreement was broken or whether an old insecurity was triggered despite respectful conduct. The responses are different: one needs accountability; the other needs support and gradual learning.

**Take this with you:** listen to jealousy as an alarm, then investigate. An alarm tells you to look; it does not tell you who to control.$en202$, 'COUPLES', 202),
('en', 'en-couple-agreements-without-accessories', 'Couple agreements without turning third people into accessories', 'A couple may protect its relationship without reducing another adult to a disposable role. Agreements must respect everyone affected.', $en203$Couples naturally arrive with shared history and commitments. Problems begin when that history is treated as a licence to decide everything for a third person: what they may feel, whom they may contact, or how quickly they must disappear afterwards.

An agreement between partners binds those partners. It does not secretly bind another adult who never accepted it. Conditions that affect the invited person must be disclosed early and negotiated with them, not announced after attachment or intimacy has begun.

### Questions that reveal hidden inequality

- Can the third person say no without losing all contact?
- Are they allowed to communicate directly with each partner?
- What happens if attraction is uneven?
- Can the couple change the rules unilaterally after the experience starts?
- Is privacy mutual, or is only the third person expected to remain invisible?

Avoid “package deal” language that erases individual consent. A person may like both partners differently, want friendship with one, or decide not to continue. Nobody owes symmetrical desire.

Couple privilege cannot always be removed, but it can be named and handled responsibly. Be honest about priorities, housing, public recognition and decision-making power. Do not promise equality that the structure cannot deliver.

**Take this with you:** protect the relationship through honesty and behaviour, not by making another person smaller.$en203$, 'COUPLES', 203),
('en', 'en-after-the-meeting-debrief', 'After the meeting: debrief, care and decisions without rushing', 'A thoughtful debrief separates feelings from verdicts. Everyone needs space, care and a voice in what happens next.', $en204$The hours after a shared experience can contain excitement, vulnerability, jealousy, tiredness and uncertainty at once. A debrief is useful, but immediate emotional intensity is a poor moment for permanent rules or blame.

First address practical care: safe transport, hydration, privacy, contraception or sexual-health needs, and whether anyone wants contact or quiet. Couples should resist disappearing into a private post-mortem while leaving the third person without information.

### Use two conversations

Have a short check-in soon afterwards: “Are you safe?”, “Is there anything urgent we should know?” and “When shall we talk properly?”. Later, when everyone has rested, discuss what felt welcome, what felt difficult, whether agreements held and what each person wants next.

Speak from experience rather than issuing a verdict on somebody’s character. “I felt excluded when…” invites useful detail; “You ruined it” creates defence. Allow different memories without forcing instant consensus.

If one person wants to continue and another does not, nobody should be kept as leverage in a couple’s conflict. Communicate the decision respectfully and directly. Do not ghost merely because the couple feels awkward.

Debriefing is also where better agreements are born. Change only what the experience taught you, rather than building a fortress around every uncomfortable feeling.

**Take this with you:** care after an encounter is part of consent. Closure, clarity and kindness matter even when there will not be a second meeting.$en204$, 'COUPLES', 204),

('en', 'en-opening-a-relationship', 'Opening a relationship: change the agreement, do not escape the conversation', 'Opening well means replacing an old agreement with an informed new one. It cannot repair avoidance, betrayal or incompatible wishes by itself.', $en301$A relationship becomes open when everyone knowingly agrees that certain connections outside it are possible. It is not open merely because one person has already acted outside the agreement or because the other feels unable to refuse.

Begin with motives. Curiosity, autonomy and the capacity for multiple connections can be workable motives. Using openness to avoid ending a relationship, legitimise an affair after the fact or force a reluctant partner usually deepens the original problem.

### Build the new agreement slowly

Discuss what kinds of connection are possible, what information is private or shared, safer-sex practices, time, money, home spaces, mutual acquaintances and how agreements will be reviewed. Distinguish reassurance from surveillance: knowing what affects your health or schedule is different from demanding every message.

Start with reversible steps. Meeting people for conversation before intimacy, for example, creates real information without pretending that every possible future can be solved in advance. Schedule review points and preserve the right to pause new activity while discussing a genuine problem.

Opening will not make insecurity disappear. It asks both people to develop emotional regulation, honest scheduling and the ability to hear unwelcome truths without punishment.

**Take this with you:** open the conversation before opening the relationship. A new structure is sustainable only when the agreement is as consensual as the connections it permits.$en301$, 'OPEN_RELATIONSHIPS', 301),
('en', 'en-rules-boundaries-and-agreements', 'Rules, boundaries and agreements: three different things', 'Boundaries describe what I will do; agreements describe what we choose together; rules often try to control someone else. Naming the difference improves decisions.', $en302$These words are often used interchangeably, but they distribute power differently. A **boundary** concerns your own participation: “I will not have unprotected sex” or “I will leave a conversation where I am insulted.” An **agreement** is a shared commitment negotiated by the people it affects. A **rule** often instructs another person regardless of their consent.

Not every rule is automatically abusive, and boundaries can be phrased manipulatively. “My boundary is that you may never date anyone attractive” is still an attempt at control. The useful question is: who is being asked to do what, and did they freely agree?

### Make agreements operational

Replace vague promises such as “Do not make me jealous” with observable commitments: scheduling notice, safer-sex steps, no intimate activity in a shared home without agreement, or a check-in after overnight plans. Include what happens if the agreement is broken: disclosure, testing, a pause and a review—not automatic humiliation.

Agreements require revision because people and circumstances change. Review them at planned times, not only during crisis. Anyone affected should have a voice; a couple cannot create duties for an outside partner in a room where that person is absent.

**Take this with you:** a strong agreement creates predictability without pretending to own another person.$en302$, 'OPEN_RELATIONSHIPS', 302),
('en', 'en-time-information-and-health', 'Time, information and health: logistics are intimacy too', 'Calendars, disclosure and sexual-health decisions shape trust. Ignoring logistics turns avoidable friction into emotional injury.', $en303$Open relationships do not fail only over grand emotions. They are often strained by late messages, unequal free time, hidden costs, neglected childcare, changing health risk and one person carrying all the organisation.

Treat time as a shared resource without treating partners as possessions. Agree how plans enter the calendar, how much notice is reasonable, which commitments take priority in an emergency and how protected couple, family or personal time is maintained. Fairness is not always equal hours; it is a process everyone can understand and challenge.

### Information with a purpose

Decide what must be disclosed because it affects consent, health or shared commitments. Names, private messages and sexual details may belong to another person and should not be automatically reported. “Tell everything” can become surveillance; “tell nothing” can remove informed choice.

Create a sexual-health protocol: barrier use, testing intervals based on actual practices and professional advice, symptoms, vaccination, contraception and how changes are communicated before further contact. Testing is a snapshot, not a moral certificate.

Include recovery time and emotional labour in the schedule. The person who stays home is not automatically available for every practical burden.

**Take this with you:** calendars and health conversations may not feel romantic, but reliability is one of intimacy’s least glamorous—and most valuable—forms.$en303$, 'OPEN_RELATIONSHIPS', 303),
('en', 'en-pause-close-or-end', 'Pause, close or end: when the model is no longer sustainable', 'Changing course is not failure. A pause can create clarity, but it must not be used to erase other people or avoid an honest ending.', $en304$An open arrangement may stop working because of broken agreements, exhaustion, major life changes, incompatible needs or a loss of genuine consent. The mature response is not to defend the model at all costs. It is to identify what needs to stop and whom the decision affects.

A **pause** should have a purpose, scope and review date. Does it stop new dates, sexual contact or all communication? What happens to existing partners? Indefinite ambiguity protects the central couple while leaving others suspended.

Closing the relationship requires more than one couple conversation if real connections already exist. Outside partners are not subscriptions that can be cancelled without care. You may choose your relationship structure, but you remain responsible for honest communication and humane endings.

### Diagnose before deciding

Ask whether the problem is the structure itself, a specific broken agreement, poor scheduling, untreated conflict or one partner’s lack of consent. Different causes need different responses. Couple therapy with a suitably informed professional may help, but it should not be used to pressure somebody into openness.

Sometimes the honest conclusion is that the partners want incompatible lives. Closing may not restore trust, and staying open may not preserve the couple.

**Take this with you:** sustainability is not measured by never changing the agreement. It is measured by changing it truthfully, with care for everyone whose life has become connected to it.$en304$, 'OPEN_RELATIONSHIPS', 304);

INSERT INTO "guide_editorial_translations" VALUES
('en', 'en-polyamory-and-multiple-autonomies', 'Polyamory is not merely having several relationships: it means consenting to several autonomies', 'Multiple relationships require more than permission to date. They require respect for each person as a full decision-maker with bonds that are not owned by others.', $en401$Polyamory describes consensual possibilities for more than one loving or intimate relationship. Its difficult part is not counting partners; it is accepting that each person has an independent inner life, develops bonds you cannot script and may make choices you would not make.

Consent must exist throughout the network. One partner’s approval does not replace another person’s choice, and nobody joins a relationship under terms that were concealed from them. Being “primary” or living together can explain practical priorities, but it does not make other people less real.

### Autonomy with responsibility

Autonomy is not doing whatever you want and informing everyone afterwards. Decisions affect time, health, housing, finances and emotional security. Responsible autonomy combines freedom with truthful information, dependable commitments and willingness to repair harm.

Ask whether each relationship has room to develop at its own pace. Can people communicate directly? Can they decline group contact? Can a relationship end without the whole network voting on it? Can somebody raise a concern without being labelled jealous or “not poly enough”?

Polyamory is not morally superior to monogamy, and it does not suit everyone. What makes either structure ethical is informed consent, realistic capacity and behaviour that matches promises.

**Take this with you:** multiple love is not a shortcut around limits; it is an invitation to take several people’s autonomy and vulnerability seriously.$en401$, 'POLYAMORY', 401),
('en', 'en-hierarchy-couple-privilege-and-autonomy', 'Hierarchy, couple privilege and autonomy: naming power', 'Power exists in time, housing, money and public recognition. Naming hierarchy honestly is safer than promising equality that the structure cannot provide.', $en402$Some networks use explicit hierarchy, such as primary and secondary partners. Others reject those labels while still giving a cohabiting or married couple greater power. The issue is not the vocabulary alone; it is whether people can see the real structure before becoming vulnerable inside it.

Couple privilege may appear in automatic priority, veto power, shared finances, legal rights, family recognition or the ability to end someone else’s relationship. Some advantages cannot simply be removed, but they can be acknowledged instead of disguised.

### Questions about power

- Who decides schedules, holidays and access to shared spaces?
- Can one relationship be ended by people outside it?
- Who bears secrecy while others receive public recognition?
- What promises are actually possible under the current structure?
- Can someone negotiate, or only accept a prepared package?

Do not advertise “everyone is equal” when decisions are not equal. Offer precise information and let people decide whether the available relationship meets their needs. A descriptive hierarchy explains existing commitments; a prescriptive hierarchy permanently limits intimacy to protect status.

Power becomes more dangerous when it cannot be discussed. The person with more security should carry more responsibility for clarity, not demand more accommodation from the person with less.

**Take this with you:** honesty about inequality does not solve it, but it gives everyone the information required for genuine consent.$en402$, 'POLYAMORY', 402),
('en', 'en-jealousy-envy-and-compersion', 'Jealousy, envy and compersion: a vocabulary for complex emotions', 'Different emotions need different responses. Naming fear, longing, comparison and joy more precisely prevents one feeling from becoming a verdict.', $en403$Jealousy often mixes fear of loss with comparison and uncertainty. Envy is different: it points towards something another person has that you also want—time, novelty, recognition or affection. Compersion describes pleasure in another person’s joy, but it is neither mandatory nor proof of superior maturity.

More than one emotion can be true. You may be pleased that a partner had a meaningful date and still feel lonely. You may feel secure in the relationship yet envy the freedom available to someone else.

### Turn emotion into information

Name the trigger, the story and the need. “When the plan changed without warning, I imagined I no longer mattered; I need more reliable scheduling” is actionable. “You make me jealous” transfers the entire emotion to somebody else.

Regulate before negotiating. Sleep, eat, move, breathe or write before proposing permanent restrictions. Then check the facts: was an agreement broken, was important information missing, or did respectful behaviour activate an old fear? Accountability and reassurance are not interchangeable.

Do not perform compersion to appear enlightened. Forced positivity can hide pain until it becomes resentment. Neutral acceptance is a valid destination.

**Take this with you:** emotions deserve attention but not automatic authority. A richer vocabulary creates more possible responses than control or silence.$en403$, 'POLYAMORY', 403),
('en', 'en-metamours-networks-and-saturation', 'Metamours, networks and saturation: relationships beyond the couple', 'Partners of partners, wider networks and limited capacity shape polyamorous life. Respect does not require forced friendship, and love does not create unlimited time.', $en404$A metamour is a partner of your partner. Some metamours become friends; others prefer polite distance. Neither model is inherently more advanced. The minimum is respectful conduct and enough communication to manage shared health, schedules or emergencies.

Kitchen-table polyamory, parallel polyamory and arrangements between them describe levels of contact, not grades of morality. Contact should be negotiated, never used as a test of belonging. Nobody should be forced into group intimacy, shared chats or friendship to keep a romantic relationship.

### Recognise saturation

Poly-saturation occurs when a person has reached their practical or emotional capacity for relationships. Love may feel abundant, but hours, attention and recovery are finite. Warning signs include chronic lateness, forgotten commitments, crisis-only communication and relying on one partner to absorb every disappointment.

Map the full network of obligations: work, children, caregiving, friendships, health and solitude—not only dates. Before beginning a new connection, ask what existing commitment will receive less time and whether that change has been communicated.

Metamour problems should normally be addressed by the shared partner taking responsibility for their own promises, rather than turning two people into rivals for management.

**Take this with you:** a healthy network needs boundaries around capacity as much as openness to connection.$en404$, 'POLYAMORY', 404),

('en', 'en-your-risk-map', 'Your risk map: deciding what to reveal, to whom and when', 'Privacy improves when disclosure is deliberate. Map the possible harm, the trust required and the minimum information needed at each stage.', $en501$Privacy is not achieved by revealing nothing. It is achieved by deciding consciously which information serves the connection and which information creates unnecessary exposure. Different people face different consequences from being identified, including employment, family conflict, stigma or physical danger.

List the data that can connect your profile to your offline identity: face, workplace, neighbourhood, phone number, social handles, distinctive tattoos, car registration, home interiors and image metadata. Then rate both impact and likelihood if each item spreads beyond its intended audience.

### Use progressive disclosure

Share the minimum needed for the current stage. A first chat may not require a surname or exact workplace. A meeting needs enough information for safety and accountability, but that information can be exchanged through controlled channels. Trust should be based on consistent behaviour over time, not urgency or declarations.

Couples should agree what information belongs to both and what remains individual. One partner cannot consent to reveal the other’s identity. The same principle applies to messages and photographs from previous connections.

Review your map when circumstances change. A harmless detail can become identifying when combined with several others.

**Take this with you:** privacy is not secrecy without direction. It is data minimisation, staged trust and clear consent about who may know what.$en501$, 'PRIVACY', 501),
('en', 'en-intimate-photos-face-metadata-and-lasting-risk', 'Intimate photographs: faces, metadata and risk that does not disappear', 'Every intimate image creates a copy you may not fully control. Reduce identifying detail, protect the file and agree explicitly on its use.', $en502$Once an image leaves your device, technical controls can reduce risk but cannot promise recovery. Screenshots, a second camera, backups or compromised accounts can bypass disappearing messages. Send only what fits your own risk tolerance—not what somebody pressures you to prove.

Before sharing, inspect identifying elements: face, tattoos, jewellery, mirrors, documents, views from windows and recognisable rooms. Remove location metadata and avoid filenames that include your real name. Keep originals in protected storage rather than a general photo roll that syncs everywhere.

### Consent travels with the image

Receiving a photograph does not authorise saving, showing, editing, training systems with it or forwarding it. Ask before each new use. Couples must not assume that an image sent to one partner is automatically shared with the other.

Use strong device authentication, encrypted services and restricted previews on lock screens. Delete images when the agreed purpose ends, including accessible backup copies where possible.

If an image is threatened or exposed, preserve evidence, stop negotiating with an extortionist, report the account and seek platform, legal or specialist support. Do not pay under the assumption that payment guarantees deletion.

**Take this with you:** the safest intimate photograph is one that reveals only what you could tolerate losing control of.$en502$, 'PRIVACY', 502),
('en', 'en-discretion-is-not-deception', 'Discretion is not deception: where privacy ends and secrecy begins', 'Privacy protects legitimate boundaries; deception removes another person’s ability to choose. The difference is who is affected by the hidden information.', $en503$Adults are entitled to private thoughts, conversations and identities. Not every partner needs every message or intimate detail. But information stops being merely private when hiding it changes another person’s consent, health, shared finances or understanding of the relationship agreement.

A discreet profile may protect someone from colleagues or public exposure. A secret profile used to bypass an agreement is different. The first limits access by outsiders; the second withholds material facts from someone whose decisions depend on them.

### Three questions

Ask whether the hidden fact affects another person’s body or health, whether it breaks an explicit commitment, and whether disclosure would reasonably change their decision to participate. A yes suggests deception rather than ordinary privacy.

Do not recruit new connections into maintaining lies they did not choose. Saying “my situation is complicated” is not informed disclosure if the practical reality is that a partner believes the relationship is exclusive.

At the same time, transparency must not become surveillance. Demanding passwords, message transcripts or constant location is not the price of honesty. Agreements should identify relevant information without erasing individual space.

**Take this with you:** privacy lets each person keep a self; deception takes meaningful choice away from somebody else.$en503$, 'PRIVACY', 503),
('en', 'en-when-privacy-fails', 'When privacy fails: a response plan for exposure and stalking', 'Fast, organised action limits harm. Preserve evidence, secure accounts, involve trusted people and escalate threats instead of facing them alone.', $en504$An exposure may begin with a leaked image, a suspicious login, doxxing, impersonation or repeated unwanted contact. Panic makes prioritisation difficult, so prepare a short plan before you need it.

First assess immediate physical danger. If threats are credible or someone knows your location, move to safety and contact emergency or specialist services. Tell a trusted person what is happening. Do not meet the aggressor to “sort it out”.

### Preserve, then secure

Capture screenshots with dates, usernames, URLs and the surrounding conversation. Save copies somewhere the aggressor cannot access. Then change passwords from a trusted device, revoke active sessions, enable multi-factor authentication and secure the email account used for recovery.

Report the profile and specific content through the platform. Contact hosting or search services when relevant. If work or family exposure is likely, decide who needs a concise warning before the aggressor controls the story.

Avoid prolonged negotiation, retaliation or public arguments that reveal more data. Blocking is useful after evidence is preserved. Keep a log of incidents; repeated small contacts can establish a pattern.

**Take this with you:** exposure is not your fault because you trusted someone. A calm sequence—safety, evidence, account security, reporting and support—restores options.$en504$, 'PRIVACY', 504),

('en', 'en-fake-profiles-manipulation-and-fraud', 'Fake profiles, manipulation and fraud: signs that call for a brake', 'Inconsistent identity, rapid emotional escalation and financial requests are reasons to slow down. Verification should protect you without becoming intrusive.', $en601$Fraud rarely begins with an obvious demand. It often begins with attention, similarity and urgency. A person may mirror your desires, move quickly to another platform and create a crisis only after emotional trust has formed.

Warning signs include inconsistent biographical details, images that appear elsewhere, refusal of any live verification, pressure to keep the connection secret, dramatic declarations very early, investment opportunities, requests for money or gift cards, and threats involving intimate images.

### Verify proportionately

Ask for a brief live video or an in-app verification step, but do not demand identity documents or private data you cannot protect. Meet first in a public place and keep independent transport. Tell someone you trust where you are.

Never send money to unlock a meeting, solve an emergency, pay customs, invest on someone’s behalf or stop blackmail. If something feels wrong, pause before confronting the person; preserve messages and transaction details, report the account and contact your bank quickly if money moved.

Genuine people can also be private or camera-shy. One sign alone is not proof. Look for patterns and for hostility when reasonable safety boundaries are proposed.

**Take this with you:** trust grows through consistent, verifiable behaviour. Urgency is often the tool used to prevent you from checking.$en601$, 'SAFETY', 601),
('en', 'en-shared-sexual-health', 'Shared sexual health: conversations without interrogation or stigma', 'Health conversations work best when everyone shares practices, tests and limits without treating status as character.', $en602$Sexual-health disclosure is not a confession. It is a practical exchange that allows informed choices. Begin by sharing your own recent testing, relevant practices, barrier preferences, vaccination and what changes you would communicate—then invite the other person to do the same.

A test result is a snapshot shaped by timing and which infections were tested. “I am clean” is inaccurate and stigmatising; use specific language about results, dates and exposure since testing. Absence of symptoms does not rule out infection.

### Agree before contact

Discuss barriers for different activities, contraception, fluid exchange, cleaning of shared toys, symptoms, current treatment and when testing will be repeated. Base frequency on actual practices and professional guidance, not on moral categories such as “serious” or “casual” partner.

If risk changes, disclose it before further contact so others can choose. A positive result calls for medical advice, appropriate partner notification and care—not blame. Avoid demanding more personal history than is necessary for the decision at hand.

Consent includes the conditions around safer sex. Removing or changing an agreed barrier without permission violates that consent.

**Take this with you:** precise, mutual and non-judgemental information protects better than assumptions or interrogation.$en602$, 'SAFETY', 602),
('en', 'en-block-report-and-preserve-evidence', 'Block, report and preserve evidence: protection tools, not drama', 'You do not owe continued access to someone who ignores boundaries. Preserve useful evidence, report clearly and block when contact is unsafe.', $en603$Blocking is a boundary, not a debate. Use it when contact becomes unwanted, manipulative, threatening or persistently disrespectful. You do not need to provide a final explanation if doing so creates more risk.

Before blocking, preserve evidence if there has been harassment, fraud, threats or non-consensual sharing. Capture the account identifier, dates, complete messages, media references and any move between platforms. Do not edit screenshots in ways that remove context; keep originals securely.

### Make a useful report

Describe observable behaviour: what happened, when, through which account and which rule or safety concern it raises. Separate facts from assumptions and mention immediate danger. One clear report is more actionable than repeated insults.

Do not organise public retaliation, publish private data or ask friends to confront the person. These actions can escalate risk and complicate an investigation. If a threat extends offline, involves extortion or creates immediate danger, contact the appropriate authorities or specialist support.

After blocking, review privacy settings, active sessions and mutual contacts who may reveal information. Harassment sometimes continues through new accounts, so keep a dated incident log.

**Take this with you:** using safety tools early is not overreacting. It is how access is withdrawn when consent to contact has ended.$en603$, 'SAFETY', 603),
('en', 'en-account-security', 'Account security: passwords, two-factor authentication and dangerous messages', 'A private profile is only as secure as its email, device and recovery methods. Small security habits prevent disproportionate harm.', $en604$Use a long, unique password for Between Us and a different one for the email account that can reset it. A password manager makes uniqueness realistic. Enable multi-factor authentication where available, preferably with an authenticator app or security key.

Secure the device as well: current software, screen lock, hidden notification previews and remote-locate or erase features. Review logged-in sessions and remove devices you no longer recognise or use. Shared devices require separate user accounts and deliberate logout.

### Treat messages as untrusted

Phishing may imitate platform support, claim that your account will close or invite you to “verify” through a link. Open the application directly instead of using the link. Staff should never need your password or authentication code.

Be careful with files, QR codes and requests to install apps or share your screen. A romantic connection can still be a route into an account. If you entered credentials on a suspicious page, change the password immediately from a trusted device, revoke sessions and secure the recovery email.

Keep recovery codes offline and update old phone numbers or addresses. Security is strongest before a crisis, when changes are calm and deliberate.

**Take this with you:** privacy settings control visibility; account security controls who can become you.$en604$, 'SAFETY', 604);

INSERT INTO "guide_editorial_translations" VALUES
('en', 'en-a-profile-that-attracts-without-performing', 'A profile that attracts without performing a character', 'A good profile is specific enough to feel human and honest enough to survive a real conversation. Attraction does not require inventing a persona.', $en701$A profile is an invitation, not an advertisement that must please everyone. Generic perfection—“open-minded, no drama, ask me anything”—gives little information and often hides the person behind a marketable character.

Choose details that help compatible people recognise you: how you like to spend time, the pace you prefer, what kind of connection you can realistically offer and one or two boundaries that shape contact. Show personality through specifics rather than claims. “I like slow conversations and live jazz” says more than “fun and cultured”.

### Promise only what you can deliver

Do not describe yourself as single, available every weekend or open to a relationship if your circumstances contradict it. State relationship status and relevant agreements truthfully without exposing another person’s private data. If discretion limits photographs or public meetings, explain the practical consequence.

Avoid lists that speak about people as products. Preferences can be expressed respectfully and positively: describe what tends to work for you instead of ranking bodies or identities.

Review the profile after real conversations. If the same misunderstanding keeps happening, the text may be attracting expectations you did not intend.

**Take this with you:** the goal is not the greatest number of matches. It is fewer surprises between the profile and the person who arrives.$en701$, 'PROFILES', 701),
('en', 'en-couple-profile-two-voices', 'A couple profile: two voices, not one joint brand', 'A couple profile should make both people visible as individuals, explain the shared intention and show that consent is not delegated.', $en702$A joint profile easily becomes the voice of the partner who writes more, replies faster or feels more enthusiastic. Correct that imbalance deliberately. Introduce each person separately: interests, orientation where relevant, boundaries, availability and what each hopes to explore.

Then explain the shared intention. Are you looking for conversation, a recurring connection, another couple or a particular experience? What decisions are individual and which require joint agreement? Avoid presenting a complete script into which another person must fit.

### Signs of a trustworthy couple profile

- Both partners know the profile exists and can access it.
- Photographs and personal details were approved by each person shown.
- Either partner can speak directly rather than through a manager.
- Uneven attraction can be discussed without blame.
- A new person will not be asked to repair the couple’s conflict.

Do not use “we” to hide disagreement. It is acceptable to say that your boundaries differ. That information helps others give informed consent. Also state whether messages are read by both partners; privacy expectations change when a conversation has an unseen audience.

**Take this with you:** a strong couple profile does not erase two people into a brand. It reveals two accountable adults capable of making a shared invitation.$en702$, 'PROFILES', 702),
('en', 'en-profile-photos-attraction-authenticity-and-control', 'Profile photographs: attraction, authenticity and control of exposure', 'Photographs should create enough trust without revealing more than your risk tolerance allows. Authenticity and privacy can be balanced.', $en703$Photographs communicate presence quickly, but they also contain more identity data than most profiles realise. Decide what the image must achieve: show current appearance, style, warmth or couple chemistry. Then remove details that do not serve that purpose.

Use recent, representative images. Heavy filters, old photographs or another person’s picture may produce more clicks but destroy trust at the first meeting. Privacy does not justify deception: cropped or softly obscured images can be honest when their limitation is clear.

### Control exposure

Check backgrounds, mirrors, workplace badges, children’s items, car registrations, tattoos and location metadata. Get consent from every recognisable person. Never upload an ex-partner or friend and simply cover their face if the context remains intimate.

Separate public, blurred and private galleries according to risk. Private access is still not a guarantee against screenshots, so reserve highly identifying or intimate images for situations where the remaining risk is acceptable.

Couples should avoid using one partner as the visual bait while barely showing the other. The gallery should match who will actually participate.

**Take this with you:** an effective photograph is truthful, current and deliberately exposed—not merely attractive.$en703$, 'PROFILES', 703),
('en', 'en-preferences-without-dehumanising', 'Preferences without dehumanising: filters, language and compatibility', 'You may choose who you connect with. The way you express that choice can remain clear without turning identities and bodies into insults.', $en704$Attraction is personal, and nobody owes romantic or sexual access. However, a preference does not need to become a public verdict about the worth, cleanliness or normality of people outside it.

Write towards compatibility. Describe the dynamics, ages within a lawful adult range, distance, availability or practices that work for you. Avoid degrading exclusions, racial stereotypes, fetishising identities or language that treats a person as a body part required to complete a scene.

### Examine what the filter is doing

Some filters protect a real boundary; others reproduce assumptions that have never been questioned. Ask whether the category predicts the quality you actually seek. Also consider the cumulative effect of highly narrow requirements: an apparently ideal checklist may leave no space for a real human being.

Private interests should not be imposed as opening questions. Signal them with enough clarity for compatible people to opt in, then discuss details after mutual interest and trust.

When declining, a short respectful message is enough. You do not owe an attraction analysis, and the other person does not need a list of traits they cannot change.

**Take this with you:** filters can organise discovery; they should not become permission to dehumanise the people who remain outside them.$en704$, 'PROFILES', 704),

('en', 'en-a-safer-first-meeting', 'A safer first meeting: a simple plan and an easy exit', 'Meet in public, keep your own transport and give a trusted person the practical details. Safety works best when leaving is easy.', $en801$A first meeting is for gathering information, not proving trust. Choose a public, staffed place with reliable transport and mobile coverage. Arrive and leave independently so nobody controls your route home.

Tell a trusted person whom you are meeting, where and when you expect to check in. Share the profile or contact details available to you. A safety check should include a clear action if you miss it, not merely “call me sometime”.

### Keep the plan reversible

Do not reveal your home address or agree to be collected there. Limit alcohol and keep control of your drink, phone, keys and belongings. If plans move to a private place, treat that as a new decision rather than the automatic next stage.

For meetings with a couple, confirm that both people know about the arrangement and that the people who arrive match the profile. You are allowed to leave because the atmosphere feels wrong even without evidence you can explain.

Prepare a plain exit line and enough money or battery for the journey. Courtesy never requires staying. If pressure, identity inconsistency or anger appears, move towards staff or other people and seek help.

**Take this with you:** a good safety plan does not predict danger; it preserves choices while you learn who is in front of you.$en801$, 'FIRST_MEETINGS', 801),
('en', 'en-expectations-alcohol-and-pace', 'Expectations, alcohol and pace: what to say before arriving', 'Clarifying the purpose and limits of a meeting prevents assumptions. Alcohol cannot convert an unclear situation into consent.', $en802$Before meeting, agree on the basic shape: coffee, dinner, conversation, possible intimacy or explicitly no intimacy. Discuss who will attend, expected duration, payment, transport and any hard boundaries. A date is not a contract, but clarity reduces the pressure created by incompatible assumptions.

If alcohol is involved, decide limits while sober. Keep your own drink and do not use intoxication as courage for a step that has not been discussed. A person who becomes too impaired to understand or choose cannot give valid consent, even if they were enthusiastic earlier.

### Pace belongs to everyone

The slowest comfortable pace sets the pace for shared activity. Somebody may want conversation but not touch, a kiss but not a private venue, or one experience but not a second. Each transition needs its own willingness.

Couples should not create a two-against-one atmosphere or discuss private decisions in coded side conversations. Make room for the other person to pause without being watched for disappointment.

Confirm how the meeting ends and whether there will be a later message. These small expectations prevent uncertainty from turning into needless harm.

**Take this with you:** say enough before arriving that nobody has to negotiate basic safety while attraction and alcohol are already changing the room.$en802$, 'FIRST_MEETINGS', 802),
('en', 'en-meeting-a-couple-without-an-interview', 'Meeting a couple without making it feel like a job interview', 'Curiosity should flow in every direction. A third person is evaluating the couple too and deserves conversation rather than assessment.', $en803$Couples often arrive with a long private discussion and a list of questions. The new person arrives without that shared preparation and can feel placed before a panel. Replace interrogation with mutual discovery.

Share information before demanding it. Explain your relationship, intention and relevant boundaries, then invite questions. Each partner should speak for themselves. Avoid comparing answers in real time or seeking proof that the person can satisfy a predefined role.

### Make the interaction balanced

Ask about interests, pace and expectations, not only sexual availability. Let ordinary conversation exist. Notice whether the seating, eye contact and private jokes exclude someone. If one partner becomes quiet, pause openly instead of continuing while the couple silently negotiates.

The person meeting the couple also needs to assess safety: Are both partners genuinely consenting? Can they disagree respectfully? Will private messages remain private? What happens if attraction is not equal?

No one owes a decision at the table. End with a clear way to communicate later, and do not turn travel, dinner or time invested into emotional debt.

**Take this with you:** a successful first meeting is not an audition. It is three or more adults deciding, with equal freedom, whether another conversation makes sense.$en803$, 'FIRST_MEETINGS', 803),
('en', 'en-after-the-first-meeting', 'After the first meeting: interest, rejection and silence', 'Clear, timely communication is kinder than ambiguity. Interest can be expressed without pressure, and rejection without a personal indictment.', $en804$After a first meeting, people often read meaning into response time, punctuation and silence. Reduce that uncertainty with a simple agreement: when and through which channel will everyone check in?

If interested, say what you enjoyed and propose a concrete next step while leaving room for a no. Avoid demanding immediate reassurance or escalating to intense promises after one meeting. Chemistry is information, not yet a relationship.

### Decline with clarity

A respectful rejection can be brief: “Thank you for meeting us. I did not feel the compatibility I need, so I will not continue. I wish you well.” You do not need to criticise appearance, identity or performance. Couples should agree who communicates and ensure the message does not blame one partner as an excuse.

Ghosting may be appropriate when contact feels unsafe or a boundary has already been ignored. Otherwise, one clear message is usually more humane. After sending it, you are not obliged to debate the decision.

If you receive a no, acknowledge it and stop pursuing. Do not ask for coaching, bargain or contact the other member of a couple privately to reverse the outcome.

**Take this with you:** closure is a small act of care. It protects dignity even when compatibility did not appear.$en804$, 'FIRST_MEETINGS', 804),

('en', 'en-desire-fantasy-and-practice', 'Desire, fantasy and practice: not everything exciting needs to happen', 'A fantasy can be valuable without becoming a plan. Separate imagination, curiosity and real-world willingness before involving anyone else.', $en901$Fantasy is a space where consequences, logistics and other people’s autonomy may disappear. That is part of its function. Wanting an idea in imagination does not mean wanting every real detail, and choosing not to enact it does not make the fantasy dishonest.

Ask what element creates excitement: novelty, power, attention, taboo, surrender, aesthetics or a specific act. Often the underlying desire can be explored in several ways, including conversation, fiction, role-play or a limited version with lower risk.

### Test reality gently

Move from fantasy to information before moving to action. Learn about physical and emotional risks, discuss it while calm and identify what would make you stop. Consider how you might feel afterwards, not only at the peak of excitement.

Never recruit a person as a prop for a scenario they have not fully understood. Their desires may reshape the plan, and they may withdraw at any point. If the fantasy only works when someone cannot change the script, it is not ready for ethical practice.

Some interests should remain imagined because the risk is unacceptable or consent cannot be secured. That boundary is not repression; it is judgement.

**Take this with you:** fantasy asks “what excites me?” Practice must also ask “what is safe, consensual and sustainable for everyone?”$en901$, 'PRIVATE_INTERESTS', 901),
('en', 'en-how-to-share-an-interest-without-pressure', 'How to share an interest without pressuring the listener', 'Disclosure should offer information and room to decline, not create a test of love, openness or sophistication.', $en902$Choose a calm moment outside sexual activity. Ask whether the person is willing to hear about an interest, and make clear that listening does not create an obligation to try it. This small permission prevents disclosure from becoming a surprise negotiation under arousal.

Describe what the interest means to you, not only its label. Labels can contain many different practices and levels of intensity. Say whether you are sharing a fantasy, a curiosity or something important to your compatibility.

### Leave the answer open

Invite questions and allow time. A partner may need information, emotional processing or the right to say no permanently. Do not answer hesitation with repeated persuasion, gifts, guilt or claims that refusal proves lack of trust.

If the response is no, distinguish disappointment from entitlement. You can decide that an unmet interest creates incompatibility, but you cannot convert that consequence into pressure: “Do this or I leave” is not a free invitation when used during negotiation.

If the answer is maybe, define the conditions required for another conversation. No practical exploration should begin until enthusiasm and boundaries are clear.

**Take this with you:** a respectful disclosure makes honesty possible without making the listener responsible for fulfilling every desire.$en902$, 'PRIVATE_INTERESTS', 902),
('en', 'en-yes-no-maybe-list', 'The Yes, No, Maybe list: turning labels into concrete decisions', 'A shared list can start a conversation, but it is not permanent consent. Define actions, conditions and signals rather than ticking vague labels.', $en903$Yes/No/Maybe lists help people discover overlap without requiring one person to introduce every subject aloud. Their value lies in the conversation after the tick, not in the completed form.

Complete the list separately first. **Yes** means something you genuinely want to discuss or try under agreed conditions. **No** is not open to negotiation now. **Maybe** requires more information, trust, a lower intensity or a particular context. “I do not know” is also a valid answer.

### Make each item specific

A label such as restraint, group play or photography may mean radically different things. Define who, what, duration, intensity, privacy, safer-sex measures and what happens if someone stops. Mark health conditions, triggers or aftercare needs that affect the decision.

Compare lists without scoring generosity. Do not use a partner’s previous yes as leverage, and never treat a match on paper as consent in the moment. Revisit the list because experience and circumstances change.

For couples or groups, every person has an individual list. A majority cannot vote a minority into participation.

**Take this with you:** the list maps a possible conversation. Consent still happens between real people, at a specific time, and can be withdrawn.$en903$, 'PRIVATE_INTERESTS', 903),
('en', 'en-exploring-with-risk-awareness', 'Exploring with risk awareness: preparation, signals and aftercare', 'Risk cannot always be removed, but it can be understood and reduced. Preparation includes knowledge, equipment, stop signals and care afterwards.', $en904$Risk-aware exploration starts by naming the actual hazards: physical injury, panic, infection, privacy loss, emotional distress or impaired judgement. Research from credible sources and, for higher-risk practices, seek competent instruction rather than relying on dramatic online content.

Agree roles, limits, intensity, duration, contraindications and a stop signal before beginning. A traffic-light system can help, but ordinary language and non-verbal signals are also needed if speech becomes difficult. Everyone must know that stopping brings immediate care, not disappointment.

### Prepare the environment

Have suitable equipment, hygiene supplies, communication, transport and an emergency plan. Avoid mixing unfamiliar practices with significant intoxication. A sober, capable person must be able to recognise danger and act.

Aftercare is individual. It may include warmth, water, quiet, reassurance, space or a next-day message. Agree what is realistically available; do not promise continuous care you cannot provide. Later, debrief physical and emotional effects and update future limits.

Risk awareness is not a waiver of responsibility. Consent to a risky activity does not excuse negligence, concealed hazards or ignoring a stop.

**Take this with you:** preparation protects spontaneity by ensuring that, when something changes, everyone knows how to slow down, stop and care.$en904$, 'PRIVATE_INTERESTS', 904);

INSERT INTO "guide_editorial_translations" VALUES
('fr', 'fr-le-consentement-est-une-conversation-continue', 'Le consentement n’est pas un contrat signé : c’est une conversation continue', 'Un oui n’a de valeur que tant qu’il reste libre, éclairé, spécifique et actuel. Demander, écouter et s’arrêter font partie de l’intimité.', $fr101$Le consentement n’est pas l’absence d’un non. C’est la présence perceptible d’une volonté libre et partagée. Personne ne devrait avoir à résister ; chaque personne impliquée doit vérifier qu’une envie réelle existe.

Un consentement sain est **libre**, **éclairé**, **spécifique**, **réversible** et **actuel**. Accepter une conversation, un baiser ou une rencontre n’autorise pas l’étape suivante. Partager une photo privée n’autorise ni son enregistrement ni sa diffusion. Un match permet seulement d’initier un contact. Une relation ou une intimité passée ne crée jamais une permission permanente.

### Vérifier sans transformer l’intimité en interrogatoire

Des questions simples suffisent : « Veux-tu continuer ? », « Est-ce confortable ? » ou « Je peux ? ». Une question n’est sincère que si les deux réponses sont sûres. Le silence, l’immobilité, le recul, l’hésitation ou une soudaine passivité sont des raisons de s’arrêter et de vérifier. Le doute n’est jamais une autorisation.

Une personne très intoxiquée, désorientée, inconsciente ou incapable de comprendre ce qui se passe ne peut pas consentir valablement.

**À retenir :** demander est un signe de maturité, s’arrêter est une marque de respect et changer d’avis est un droit.$fr101$, 'CONSENT', 101),
('fr', 'fr-parler-avant-que-le-desir-s-accelere', 'Parler avant que le désir s’accélère : limites, attentes et signaux clairs', 'Les meilleures conversations sur les limites ont lieu avant qu’il devienne difficile de réfléchir. Se préparer retire l’ambiguïté, pas la spontanéité.', $fr102$Quand l’attirance augmente, négocier calmement devient souvent plus difficile. Parler avant une rencontre ou une expérience intime n’est donc pas de la bureaucratie : cela crée les conditions d’une spontanéité plus sûre.

Séparez trois zones. **Oui** regroupe ce que vous désirez réellement. **Peut-être** dépend de la confiance, du contexte, du rythme ou de conditions précises. **Non** contient les limites qui ne sont pas négociables maintenant. Ces zones peuvent évoluer, mais jamais par épuisement : répéter une demande jusqu’à ce que l’autre cède est une pression.

Discutez aussi des aspects pratiques : personnes présentes, informations partageables, santé sexuelle, photos, alcool, transport, nuit sur place et manière de faire une pause ou de partir. Dans un couple, chacun parle en son nom.

### Faciliter l’arrêt

Choisissez des mots simples comme « pause » ou « stop ». Un signal n’est utile que si tout le monde réagit immédiatement et sans punition. Après l’expérience, revenez sur ce qui était agréable, difficile ou à modifier, lorsque chacun est calme.

**À retenir :** des limites exprimées tôt protègent le désir plus tard. Un non clair réduit les suppositions ; un peut-être précis indique ce qu’exigerait un vrai oui.$fr102$, 'CONSENT', 102),
('fr', 'fr-la-pression-deguisee', 'La pression déguisée : reconnaître la coercition, la culpabilité et le consentement apparent', 'La coercition n’est pas toujours bruyante. La répétition, la dette affective, la peur du conflit et les rapports de pouvoir peuvent produire un oui qui n’est pas libre.', $fr103$La pression se présente souvent comme de l’affection, de la déception ou de la logique : « Si tu me faisais confiance… », « On a fait tout ce chemin » ou des demandes répétées après un refus. Le ton peut rester calme tandis que le choix devient dangereux.

Un consentement apparent peut naître de la peur de perdre une relation, d’une dépendance financière, d’un déséquilibre de pouvoir, de l’ivresse, de l’isolement ou du désir de mettre fin à une négociation incessante. Un oui prononcé ne répare pas une situation où le non entraîne une sanction.

### Signaux d’alerte

- Une limite devient un obstacle à vaincre.
- Un refus provoque bouderie, menace ou retrait d’affection.
- Un couple fait front contre une troisième personne.
- Des informations importantes apparaissent seulement une fois la personne isolée.
- Le silence et le peut-être sont traduits en accord.

Ralentissez et rétablissez une véritable liberté : temps, intimité, transport et possibilité de partir. Demandez-vous si la personne peut refuser sans craindre humiliation, perte ou abandon.

**À retenir :** le consentement se mesure aussi à la sécurité avec laquelle une personne peut dire non.$fr103$, 'CONSENT', 103),
('fr', 'fr-quand-quelque-chose-se-passe-mal', 'Quand quelque chose se passe mal : arrêter, réparer et assumer', 'Une limite franchie exige sécurité immédiate, responsabilité honnête et changement. Les bonnes intentions n’effacent pas l’impact.', $fr104$Quand une personne dit qu’une limite a été franchie, la priorité n’est pas de défendre vos intentions. Arrêtez, créez la distance demandée et vérifiez la sécurité immédiate. La personne concernée décide si elle veut parler, être accompagnée, rentrer, recevoir des soins ou ne plus avoir de contact.

Évitez « J’ai mal compris », « Tu n’as pas dit non » ou « Ce n’était pas mon intention ». Ces réponses recentrent la situation sur la personne qui a causé le tort. L’intention pourra être examinée plus tard ; elle n’annule pas l’impact.

### Assumer réellement

Nommez précisément votre acte, reconnaissez l’effet décrit, présentez des excuses sans réclamer le pardon et expliquez ce qui changera concrètement. Respectez toute demande d’espace, de blocage ou de signalement.

Si vous êtes la personne touchée, notez les faits, conservez les messages, contactez une personne de confiance et utilisez les outils de blocage et de signalement. Cherchez une aide spécialisée ou urgente si nécessaire.

Les couples ne doivent pas se refermer pour protéger leur image commune : chacun reste responsable de sa conduite.

**À retenir :** réparer commence par arrêter et reconnaître la limite, pas par gagner un débat sur les intentions.$fr104$, 'CONSENT', 104),

('fr', 'fr-sommes-nous-vraiment-prets', 'Sommes-nous vraiment prêts ? Le test avant d’inviter une autre personne', 'Une troisième personne ne peut pas réparer un couple qui évite ses conflits. Être prêt suppose un désir partagé, un non possible et du respect pour la personne invitée.', $fr201$Inviter une autre personne peut amplifier la curiosité et la complicité, mais aussi les fissures existantes. L’enthousiasme ne suffit pas. Il faut savoir être en désaccord, faire une pause et rester bienveillant lorsque la réalité diffère du fantasme.

Chaque partenaire devrait répondre séparément : est-ce que je le désire pour moi-même ou pour éviter de perdre la relation ? Puis-je entendre l’attirance de mon partenaire sans représailles ? L’un de nous peut-il interrompre le projet sans sanction ? Sommes-nous capables d’offrir à la personne invitée une autonomie plutôt qu’un rôle écrit d’avance ?

### Conditions à vérifier

- L’expérience ne sert pas à réparer une trahison ou une crise aiguë.
- Chacun peut parler directement en son nom.
- Santé sexuelle, confidentialité, nuit sur place et contact ultérieur sont discutés.
- La troisième personne peut poser ses limites et changer d’avis.
- La jalousie sera gérée sans contrôler quelqu’un d’autre.

Imaginez un scénario où l’attirance est inégale ou quelqu’un veut s’arrêter. Si la curiosité disparaît dès que l’inconfort apparaît, reportez.

**À retenir :** n’invitez pas une personne réelle dans un fantasme avant d’être prêts à respecter ses préférences, ses émotions et ses limites réelles.$fr201$, 'COUPLES', 201),
('fr', 'fr-la-jalousie-dans-le-couple', 'La jalousie dans le couple : une information émotionnelle, pas un ordre', 'La jalousie peut révéler peur, comparaison ou besoin insatisfait. Elle mérite de l’attention, mais n’autorise pas automatiquement le contrôle.', $fr202$La jalousie est un ensemble d’émotions : peur d’être remplacé, perte de statut, honte, envie, incertitude ou besoin de réassurance. La considérer comme une information permet de l’écouter sans lui confier la direction de toutes les relations.

Soyez précis. « Je suis jaloux » aide moins que « Quand tu as continué à écrire après l’heure convenue, j’ai eu peur que notre accord ne compte plus ». Décrivez l’événement, l’histoire créée par votre esprit et le besoin sous-jacent.

### Réguler avant de créer des règles

Évitez les décisions majeures en pleine activation émotionnelle. Respirez, marchez, écrivez, reposez-vous, puis demandez une forme de soutien réaliste : une heure de contact, un calendrier plus fiable ou un moment de reconnexion. Évitez les solutions qui suppriment l’autonomie d’une autre personne.

Vérifiez ensuite si un accord a été rompu ou si une conduite respectueuse a déclenché une ancienne peur. Le premier cas demande responsabilité ; le second soutien et apprentissage.

**À retenir :** écoutez la jalousie comme une alarme, puis enquêtez. Une alarme indique qu’il faut regarder, pas qui il faut contrôler.$fr202$, 'COUPLES', 202),
('fr', 'fr-accords-de-couple-sans-accessoires', 'Des accords de couple sans transformer les tiers en accessoires', 'Un couple peut protéger sa relation sans réduire un autre adulte à un rôle jetable. Les accords doivent respecter toutes les personnes concernées.', $fr203$Un couple possède une histoire et des engagements communs. Le problème commence quand cette histoire sert à décider à la place d’une troisième personne : ce qu’elle peut ressentir, avec qui elle peut parler ou à quelle vitesse elle doit disparaître ensuite.

Un accord entre partenaires oblige ces partenaires. Il n’oblige pas secrètement un autre adulte. Toute condition qui touche la personne invitée doit être annoncée tôt et négociée avec elle, avant l’attachement ou l’intimité.

### Déceler l’inégalité cachée

La troisième personne peut-elle dire non sans perdre tout contact ? Peut-elle parler séparément à chacun ? Que se passe-t-il si l’attirance est asymétrique ? Le couple peut-il modifier seul les règles ? La confidentialité est-elle réciproque ?

Personne ne doit une attirance parfaitement symétrique. Le privilège de couple ne peut pas toujours disparaître, mais il doit être nommé : priorités, logement, reconnaissance publique et pouvoir de décision. Ne promettez pas une égalité que la structure ne permet pas.

**À retenir :** protégez votre relation par l’honnêteté et vos comportements, pas en réduisant une autre personne.$fr203$, 'COUPLES', 203),
('fr', 'fr-apres-la-rencontre-debriefing', 'Après la rencontre : débriefing, attention et décisions sans précipitation', 'Un bon débriefing sépare les émotions des verdicts. Chacun a besoin d’espace, d’attention et d’une voix sur la suite.', $fr204$Les heures qui suivent une expérience partagée peuvent réunir excitation, vulnérabilité, jalousie, fatigue et incertitude. Un débriefing est utile, mais l’intensité immédiate n’est pas le bon moment pour imposer des règles permanentes ou désigner un coupable.

Commencez par les besoins concrets : retour en sécurité, eau, confidentialité, contraception ou santé sexuelle, envie de contact ou de calme. Le couple ne devrait pas se retirer dans une analyse privée en laissant la troisième personne sans information.

### Deux conversations

Faites un bref point rapidement : « Es-tu en sécurité ? », « Y a-t-il quelque chose d’urgent ? » et « Quand reparlons-nous ? ». Plus tard, reposés, discutez de ce qui était agréable, difficile, respecté ou à modifier.

Parlez de votre expérience plutôt que du caractère d’autrui. Si les souhaits pour la suite diffèrent, communiquez clairement sans utiliser une personne comme levier dans le conflit du couple. Ne disparaissez pas simplement parce que la conversation est inconfortable.

**À retenir :** l’attention après la rencontre fait partie du consentement. La clarté et la bienveillance comptent même sans deuxième rendez-vous.$fr204$, 'COUPLES', 204),

('fr', 'fr-ouvrir-une-relation', 'Ouvrir une relation : changer l’accord, pas fuir la conversation', 'Bien ouvrir signifie remplacer un ancien accord par un nouvel accord éclairé. L’ouverture ne répare pas à elle seule l’évitement, la trahison ou l’incompatibilité.', $fr301$Une relation devient ouverte lorsque toutes les personnes concernées acceptent consciemment que certaines relations extérieures soient possibles. Elle ne devient pas ouverte parce qu’une personne a déjà agi en dehors de l’accord ou parce que l’autre ne se sent pas libre de refuser.

Commencez par les motivations. Curiosité, autonomie et capacité d’aimer plusieurs personnes peuvent être des bases solides. Utiliser l’ouverture pour éviter une rupture, légitimer une liaison ou contraindre un partenaire réticent approfondit généralement le problème initial.

### Construire lentement le nouvel accord

Discutez des types de relations possibles, des informations privées ou partagées, de santé sexuelle, de temps, d’argent, du domicile, des connaissances communes et de la révision des accords. Distinguez réassurance et surveillance : connaître ce qui touche votre santé ou votre emploi du temps n’est pas exiger chaque message.

Commencez par des étapes réversibles et fixez des moments de bilan. L’ouverture demande une régulation émotionnelle, une organisation honnête et la capacité d’entendre des vérités déplaisantes sans punir.

**À retenir :** ouvrez la conversation avant la relation. La nouvelle structure n’est durable que si son accord est aussi consenti que les relations qu’elle permet.$fr301$, 'OPEN_RELATIONSHIPS', 301),
('fr', 'fr-regles-limites-et-accords', 'Règles, limites et accords : trois choses différentes', 'Une limite décrit ce que je ferai ; un accord décrit ce que nous choisissons ensemble ; une règle cherche souvent à contrôler autrui.', $fr302$Ces mots distribuent le pouvoir différemment. Une **limite** concerne votre propre participation : « Je n’aurai pas de rapport sans protection ». Un **accord** est un engagement négocié par les personnes qu’il affecte. Une **règle** dicte souvent le comportement d’autrui, qu’il l’ait librement acceptée ou non.

Une limite peut aussi être formulée de manière manipulatrice. « Ma limite est que tu ne sortes jamais avec une personne attirante » reste une tentative de contrôle. Demandez : qui doit faire quoi, et cette personne a-t-elle réellement accepté ?

### Rendre les accords concrets

Remplacez « Ne me rends pas jaloux » par des engagements observables : délai pour annoncer un rendez-vous, mesures de santé sexuelle, utilisation du domicile ou contact après une nuit ailleurs. Prévoyez ce qui se passe en cas de rupture : information, dépistage, pause et révision, plutôt qu’humiliation.

Révisez les accords à des moments prévus et donnez une voix à chaque personne concernée. Un couple ne peut pas créer des obligations pour un partenaire absent.

**À retenir :** un bon accord apporte de la prévisibilité sans prétendre posséder quelqu’un.$fr302$, 'OPEN_RELATIONSHIPS', 302),
('fr', 'fr-temps-information-et-sante', 'Temps, information et santé : la logistique aussi est intime', 'Calendriers, communication et santé sexuelle structurent la confiance. Négliger la logistique transforme des frictions évitables en blessures.', $fr303$Les relations ouvertes ne se fragilisent pas seulement à cause des grandes émotions. Elles souffrent aussi de retards, de temps libre inégal, de dépenses cachées, de charges familiales et de changements de risque sanitaire mal communiqués.

Traitez le temps comme une ressource partagée sans traiter les partenaires comme des possessions. Convenez de la manière d’inscrire les projets, du préavis raisonnable, des priorités en cas d’urgence et du maintien du temps personnel, familial ou de couple. L’équité n’est pas toujours une égalité d’heures ; c’est un processus compréhensible et discutable.

### Une information utile

Précisez ce qui doit être partagé parce que cela affecte le consentement, la santé ou les engagements communs. Les noms, messages et détails intimes peuvent appartenir à une autre personne. « Tout dire » peut devenir surveillance ; « ne rien dire » retire le choix éclairé.

Établissez un protocole de santé sexuelle : protections, dépistage adapté aux pratiques, symptômes, vaccination, contraception et communication des changements avant un nouveau contact.

**À retenir :** calendrier et santé paraissent peu romantiques, mais la fiabilité est l’une des formes les plus précieuses de l’intimité.$fr303$, 'OPEN_RELATIONSHIPS', 303),
('fr', 'fr-faire-une-pause-fermer-ou-terminer', 'Faire une pause, refermer ou terminer : quand le modèle n’est plus durable', 'Changer de direction n’est pas un échec. Une pause peut clarifier, mais ne doit pas effacer d’autres personnes ni éviter une fin honnête.', $fr304$Une relation ouverte peut cesser de fonctionner après des accords rompus, un épuisement, un changement de vie, des besoins incompatibles ou la disparition d’un consentement réel. La réponse adulte n’est pas de défendre le modèle à tout prix, mais d’identifier ce qui doit s’arrêter et qui sera affecté.

Une **pause** a besoin d’un objectif, d’un périmètre et d’une date de révision. Suspend-elle les nouvelles rencontres, l’intimité ou toute communication ? Que deviennent les relations existantes ? Une ambiguïté indéfinie protège le couple central et laisse les autres en attente.

Refermer la relation exige plus qu’une discussion privée si des liens réels existent. Les partenaires extérieurs ne sont pas des abonnements que l’on résilie sans attention.

Demandez si le problème vient de la structure, d’un accord rompu, de l’organisation, d’un conflit non traité ou d’un manque de consentement. Les réponses diffèrent. Parfois, les partenaires veulent simplement des vies incompatibles.

**À retenir :** la durabilité ne consiste pas à ne jamais changer d’accord, mais à le changer honnêtement et avec attention pour toutes les personnes liées.$fr304$, 'OPEN_RELATIONSHIPS', 304);

INSERT INTO "guide_editorial_translations" VALUES
('fr', 'fr-polyamour-et-autonomies-multiples', 'Le polyamour ne consiste pas seulement à avoir plusieurs relations : il faut consentir à plusieurs autonomies', 'Plusieurs relations exigent le respect de chaque personne comme décideur à part entière, avec des liens qui n’appartiennent pas aux autres.', $fr401$Le polyamour désigne la possibilité consentie de vivre plusieurs relations amoureuses ou intimes. La difficulté n’est pas de compter les partenaires, mais d’accepter que chacun possède une vie intérieure indépendante, développe des liens impossibles à scénariser et fasse parfois des choix différents des vôtres.

Le consentement doit exister dans tout le réseau. L’approbation d’un partenaire ne remplace jamais le choix d’un autre, et personne ne devrait entrer dans une relation dont les conditions importantes lui ont été cachées. Être « principal » ou cohabiter explique certaines priorités pratiques ; cela ne rend pas les autres personnes moins réelles.

### Autonomie responsable

L’autonomie ne signifie pas agir sans considération puis informer après coup. Les décisions touchent le temps, la santé, le logement, l’argent et la sécurité émotionnelle. Elle associe liberté, informations sincères, engagements fiables et réparation des torts.

Chaque relation peut-elle évoluer à son rythme ? Les personnes peuvent-elles communiquer directement, refuser les contacts de groupe ou soulever un problème sans être accusées de jalousie ?

**À retenir :** aimer plusieurs personnes n’évite pas les limites ; cela oblige à prendre au sérieux plusieurs autonomies et vulnérabilités.$fr401$, 'POLYAMORY', 401),
('fr', 'fr-hierarchie-privilege-de-couple-et-autonomie', 'Hiérarchie, privilège de couple et autonomie : nommer le pouvoir', 'Le pouvoir se trouve dans le temps, le logement, l’argent et la reconnaissance publique. Nommer la hiérarchie vaut mieux qu’une fausse promesse d’égalité.', $fr402$Certains réseaux utilisent une hiérarchie explicite, avec partenaires principaux et secondaires. D’autres refusent ces mots tout en donnant au couple marié ou cohabitant davantage de pouvoir. L’essentiel est que chacun puisse voir la structure réelle avant de devenir vulnérable en son sein.

Le privilège de couple apparaît dans la priorité automatique, le droit de veto, les finances, les droits juridiques, la reconnaissance familiale ou le pouvoir de mettre fin à la relation d’autrui. Certains avantages ne peuvent pas être supprimés, mais ils peuvent être reconnus.

### Questions de pouvoir

Qui décide des vacances et de l’accès au domicile ? Une relation peut-elle être terminée par des personnes qui n’en font pas partie ? Qui porte le secret tandis que d’autres sont reconnus ? Quelqu’un peut-il négocier ou seulement accepter un ensemble déjà préparé ?

Ne promettez pas « tout le monde est égal » si les décisions ne le sont pas. Donnez une information précise afin que chacun choisisse en connaissance de cause. La personne la plus protégée doit assumer davantage de clarté.

**À retenir :** reconnaître l’inégalité ne la résout pas, mais rend possible un consentement authentique.$fr402$, 'POLYAMORY', 402),
('fr', 'fr-jalousie-envie-et-compersion', 'Jalousie, envie et compersion : un vocabulaire pour des émotions complexes', 'Des émotions différentes appellent des réponses différentes. Nommer précisément peur, manque, comparaison et joie empêche une émotion de devenir un verdict.', $fr403$La jalousie mélange souvent peur de perdre, comparaison et incertitude. L’envie indique quelque chose que l’autre possède et que vous souhaitez aussi : temps, nouveauté, reconnaissance ou affection. La compersion est le plaisir ressenti devant la joie d’autrui, mais elle n’est ni obligatoire ni la preuve d’une maturité supérieure.

Plusieurs émotions peuvent coexister. Vous pouvez être heureux d’un beau rendez-vous de votre partenaire et vous sentir seul. Vous pouvez vous savoir aimé tout en enviant la liberté d’une autre personne.

### Transformer l’émotion en information

Nommez le déclencheur, l’histoire mentale et le besoin : « Quand le projet a changé sans prévenir, j’ai cru ne plus compter ; j’ai besoin d’un calendrier plus fiable ». Régulez-vous avant de négocier, puis vérifiez les faits : accord rompu, information manquante ou peur ancienne réveillée par une conduite respectueuse ?

Ne jouez pas la compersion pour paraître évolué. Une acceptation neutre est parfaitement valable.

**À retenir :** les émotions méritent de l’attention, pas une autorité automatique. Un vocabulaire riche ouvre plus de réponses que le contrôle ou le silence.$fr403$, 'POLYAMORY', 403),
('fr', 'fr-metamours-reseaux-et-saturation', 'Métamours, réseaux et saturation : les relations au-delà du couple', 'Les partenaires de partenaires et la capacité limitée façonnent le polyamour. Le respect n’exige pas une amitié forcée et l’amour ne crée pas du temps infini.', $fr404$Un métamour est le partenaire de votre partenaire. Certains deviennent amis, d’autres préfèrent une distance courtoise. Aucun modèle n’est plus évolué. Le minimum reste le respect et une communication suffisante pour la santé, l’organisation ou les urgences communes.

Le polyamour « table de cuisine », parallèle ou intermédiaire décrit un niveau de contact, pas une hiérarchie morale. Personne ne devrait être forcé à rejoindre des groupes, partager une intimité ou devenir ami pour conserver sa relation.

### Reconnaître la saturation

La saturation apparaît quand une personne atteint sa capacité pratique ou émotionnelle. L’amour peut sembler abondant ; les heures, l’attention et le repos sont limités. Retards chroniques, engagements oubliés et communication uniquement en crise sont des signaux.

Cartographiez travail, enfants, soins, amitiés, santé et solitude, pas seulement les rendez-vous. Avant une nouvelle relation, demandez quel engagement recevra moins de temps.

Les conflits entre métamours doivent généralement être gérés par le partenaire commun, responsable de ses propres promesses.

**À retenir :** un réseau sain a autant besoin de limites de capacité que d’ouverture à de nouveaux liens.$fr404$, 'POLYAMORY', 404),

('fr', 'fr-votre-carte-des-risques', 'Votre carte des risques : décider quoi révéler, à qui et quand', 'La confidentialité s’améliore lorsque chaque révélation est volontaire. Évaluez le dommage possible, la confiance nécessaire et l’information minimale utile.', $fr501$La confidentialité ne consiste pas à ne rien révéler. Elle consiste à décider quelles informations servent la relation et lesquelles créent une exposition inutile. Les conséquences d’une identification diffèrent : emploi, famille, stigmatisation ou danger physique.

Listez les données qui relient le profil à votre identité : visage, lieu de travail, quartier, téléphone, réseaux sociaux, tatouages, plaque du véhicule, intérieur du domicile et métadonnées des images. Évaluez la probabilité et l’impact d’une diffusion.

### Révélation progressive

Partagez le minimum nécessaire à l’étape actuelle. Une première discussion n’exige pas un nom complet ni l’employeur exact. Une rencontre demande assez d’informations pour la sécurité, mais celles-ci peuvent rester dans des canaux contrôlés. La confiance repose sur des comportements cohérents, pas sur l’urgence.

Dans un couple, chacun consent séparément à la révélation de son identité. Il en va de même pour les photos et messages d’anciennes relations.

Révisez la carte quand le contexte change : plusieurs détails anodins peuvent ensemble vous identifier.

**À retenir :** la confidentialité, c’est minimiser les données, construire la confiance par étapes et consentir clairement à qui peut savoir quoi.$fr501$, 'PRIVACY', 501),
('fr', 'fr-photos-intimes-visage-metadonnees-et-risque', 'Photos intimes : visage, métadonnées et risque qui ne disparaît pas', 'Chaque image intime crée une copie que vous ne contrôlerez peut-être plus. Réduisez les détails identifiants et convenez explicitement de son usage.', $fr502$Lorsqu’une image quitte votre appareil, les protections techniques réduisent le risque sans garantir sa récupération. Captures d’écran, second appareil, sauvegardes et comptes compromis contournent les messages éphémères. N’envoyez que ce qui reste compatible avec votre propre tolérance au risque.

Inspectez visage, tatouages, bijoux, miroirs, documents, vues par la fenêtre et pièces reconnaissables. Supprimez les données de localisation et évitez un nom de fichier contenant votre identité. Protégez les originaux dans un stockage sécurisé.

### Le consentement accompagne l’image

Recevoir une photo n’autorise pas à l’enregistrer, la montrer, la modifier ou la transférer. Demandez avant chaque nouvel usage. Une image envoyée à un partenaire d’un couple n’est pas automatiquement destinée à l’autre.

En cas de menace ou d’exposition, conservez les preuves, cessez de négocier avec l’auteur d’un chantage, signalez le compte et cherchez une aide adaptée. Payer ne garantit jamais la suppression.

**À retenir :** la photo intime la plus sûre ne révèle que ce dont vous pourriez supporter de perdre le contrôle.$fr502$, 'PRIVACY', 502),
('fr', 'fr-discretion-et-tromperie', 'La discrétion n’est pas la tromperie : où finit la vie privée et où commence le secret', 'La vie privée protège des limites légitimes ; la tromperie retire à quelqu’un sa capacité de choisir. La différence dépend de l’effet de l’information cachée.', $fr503$Les adultes ont droit à des pensées, conversations et identités privées. Un partenaire n’a pas besoin de chaque message ou détail intime. Mais une information cesse d’être simplement privée lorsqu’elle modifie le consentement, la santé, les finances ou la compréhension d’un accord relationnel.

Un profil discret peut protéger d’une exposition professionnelle. Un profil secret créé pour contourner un accord est différent. Le premier limite l’accès des tiers ; le second cache des faits importants à une personne dont les choix en dépendent.

### Trois questions

Le fait caché touche-t-il le corps ou la santé d’autrui ? Rompt-il un engagement explicite ? Sa révélation changerait-elle raisonnablement la décision de participer ? Un oui indique probablement une tromperie.

N’obligez pas une nouvelle relation à entretenir un mensonge qu’elle n’a pas choisi. À l’inverse, la transparence ne justifie pas mots de passe, géolocalisation permanente ou lecture de tous les messages.

**À retenir :** la vie privée permet à chacun de conserver un espace personnel ; la tromperie retire un choix significatif à quelqu’un d’autre.$fr503$, 'PRIVACY', 503),
('fr', 'fr-quand-la-confidentialite-echoue', 'Quand la confidentialité échoue : un plan contre l’exposition et le harcèlement', 'Une action rapide et ordonnée limite les dommages. Préservez les preuves, sécurisez les comptes, impliquez des proches et signalez les menaces.', $fr504$Une exposition peut commencer par une image divulguée, une connexion suspecte, une usurpation d’identité ou des contacts indésirables répétés. La panique complique les priorités ; préparez un plan simple avant d’en avoir besoin.

Évaluez d’abord le danger physique. Si une menace est crédible ou votre adresse connue, allez en lieu sûr et contactez les services compétents. Informez une personne de confiance. Ne rencontrez pas l’agresseur pour « régler » la situation.

### Préserver, puis sécuriser

Conservez captures, dates, identifiants, liens et contexte complet dans un endroit inaccessible à l’agresseur. Changez ensuite les mots de passe depuis un appareil fiable, fermez les sessions actives, activez l’authentification multifacteur et protégez l’adresse de récupération.

Signalez le compte et le contenu. Évitez les négociations longues, la vengeance et les débats publics qui dévoilent davantage. Après la collecte des preuves, bloquez et tenez un journal daté des incidents.

**À retenir :** une séquence calme — sécurité, preuves, comptes, signalement et soutien — rend des options à la personne visée.$fr504$, 'PRIVACY', 504),

('fr', 'fr-faux-profils-manipulation-et-fraude', 'Faux profils, manipulation et fraude : les signes qui imposent de ralentir', 'Identité incohérente, intensité affective rapide et demandes d’argent exigent une pause. La vérification doit protéger sans devenir intrusive.', $fr601$La fraude commence rarement par une demande évidente. Elle commence par l’attention, la ressemblance et l’urgence. Une personne peut refléter vos désirs, déplacer rapidement la conversation, puis créer une crise après avoir construit une confiance émotionnelle.

Signaux fréquents : récit incohérent, photos trouvées ailleurs, refus de toute vérification en direct, secret imposé, déclarations spectaculaires très tôt, opportunité d’investissement, demande d’argent ou menace avec des images intimes.

### Vérifier proportionnellement

Proposez une courte vidéo en direct ou une vérification intégrée, sans exiger des papiers d’identité que vous ne pouvez pas protéger. Rencontrez-vous dans un lieu public, gardez votre transport et prévenez une personne de confiance.

N’envoyez jamais d’argent pour débloquer une rencontre, résoudre une urgence, investir ou arrêter un chantage. Conservez messages et transactions, signalez le compte et contactez rapidement votre banque.

Un signe isolé n’est pas une preuve ; observez les ensembles et l’hostilité face à des limites de sécurité raisonnables.

**À retenir :** la confiance naît de comportements cohérents et vérifiables. L’urgence sert souvent à empêcher la vérification.$fr601$, 'SAFETY', 601),
('fr', 'fr-sante-sexuelle-partagee', 'Santé sexuelle partagée : parler sans interrogatoire ni stigmatisation', 'Les conversations de santé fonctionnent lorsque chacun partage pratiques, dépistages et limites sans transformer un statut en jugement moral.', $fr602$Parler de santé sexuelle n’est pas un aveu. C’est un échange pratique qui permet des choix éclairés. Commencez par vos propres dépistages, pratiques pertinentes, préférences de protection, vaccination et changements que vous communiqueriez, puis invitez l’autre à faire de même.

Un résultat est une photographie influencée par le délai et les infections recherchées. « Je suis propre » est imprécis et stigmatisant ; parlez de résultats, dates et expositions depuis le test. L’absence de symptômes n’exclut pas une infection.

### S’accorder avant le contact

Discutez protections selon les pratiques, contraception, fluides, nettoyage des objets partagés, symptômes, traitements et prochain dépistage. Adaptez la fréquence aux pratiques et aux conseils professionnels, pas à des catégories morales.

Tout changement de risque doit être communiqué avant un nouveau contact. Un résultat positif appelle soins, information appropriée des partenaires et absence de culpabilisation. Modifier ou retirer une protection convenue sans permission viole le consentement.

**À retenir :** une information précise, réciproque et sans jugement protège mieux que les suppositions.$fr602$, 'SAFETY', 602),
('fr', 'fr-bloquer-signaler-et-conserver-les-preuves', 'Bloquer, signaler et conserver les preuves : des outils de protection, pas du drame', 'Vous ne devez pas maintenir l’accès d’une personne qui ignore vos limites. Conservez les preuves utiles, signalez clairement puis bloquez.', $fr603$Bloquer est une limite, pas un débat. Utilisez cette fonction lorsque le contact devient indésirable, manipulateur, menaçant ou continuellement irrespectueux. Aucune explication finale n’est due si elle augmente le risque.

Avant de bloquer, conservez les preuves de harcèlement, fraude, menace ou partage non consenti : identifiant du compte, dates, messages complets, médias et passage éventuel vers une autre plateforme. Gardez les originaux avec leur contexte.

### Faire un signalement utile

Décrivez les faits observables : quoi, quand, via quel compte et quel risque. Distinguez faits et suppositions et précisez le danger immédiat. Un rapport clair est plus exploitable qu’une série d’insultes.

N’organisez pas de vengeance publique et ne publiez pas de données privées. Si la menace devient physique, implique un chantage ou un danger immédiat, contactez les autorités ou services spécialisés appropriés.

Après le blocage, vérifiez confidentialité, sessions et contacts communs. Conservez un journal si de nouveaux comptes apparaissent.

**À retenir :** utiliser tôt les outils de sécurité, c’est retirer l’accès lorsque le consentement au contact a pris fin.$fr603$, 'SAFETY', 603),
('fr', 'fr-securite-du-compte', 'Sécurité du compte : mots de passe, double authentification et messages dangereux', 'Un profil privé n’est pas plus sûr que son e-mail, son appareil et ses moyens de récupération. De petites habitudes évitent de grands dommages.', $fr604$Utilisez un mot de passe long et unique pour Between Us, différent de celui de l’e-mail qui permet de le réinitialiser. Un gestionnaire rend cette pratique réaliste. Activez l’authentification multifacteur, de préférence avec une application ou une clé de sécurité.

Protégez aussi l’appareil : logiciel à jour, verrouillage, aperçus masqués et fonctions de localisation ou d’effacement. Fermez les sessions inconnues. Sur un appareil partagé, utilisez des comptes séparés et déconnectez-vous volontairement.

### Considérer les messages comme non fiables

L’hameçonnage peut imiter le support, annoncer la fermeture du compte ou demander une « vérification » par lien. Ouvrez directement l’application. Le personnel n’a jamais besoin de votre mot de passe ni de votre code d’authentification.

Méfiez-vous des fichiers, QR codes, applications à installer et partage d’écran. Si vous avez saisi vos accès sur une page suspecte, changez-les depuis un appareil fiable, fermez les sessions et sécurisez l’e-mail.

**À retenir :** les réglages de confidentialité contrôlent qui vous voit ; la sécurité du compte contrôle qui peut devenir vous.$fr604$, 'SAFETY', 604);

INSERT INTO "guide_editorial_translations" VALUES
('fr', 'fr-un-profil-attirant-sans-jouer-un-role', 'Un profil qui attire sans jouer un personnage', 'Un bon profil est assez précis pour sembler humain et assez honnête pour résister à une vraie conversation. Nul besoin d’inventer un personnage.', $fr701$Un profil est une invitation, pas une publicité destinée à plaire à tout le monde. La perfection générique — « ouvert d’esprit, sans drame, demandez-moi » — donne peu d’informations et cache souvent la personne derrière un personnage commercial.

Choisissez des détails qui permettent aux personnes compatibles de vous reconnaître : votre manière de passer du temps, votre rythme, le type de lien réellement disponible et quelques limites importantes. Des exemples précis montrent mieux la personnalité que des adjectifs.

### Ne promettre que ce qui est possible

Ne vous présentez pas comme célibataire, toujours disponible ou prêt pour une relation si la réalité contredit ces affirmations. Indiquez honnêtement votre situation et les accords pertinents sans révéler les données privées d’autrui. Si la discrétion limite les photos ou les lieux publics, expliquez la conséquence pratique.

Exprimez les préférences sans transformer les personnes en produits. Décrivez positivement ce qui fonctionne pour vous, au lieu de classer les corps et identités.

Révisez le profil si les mêmes malentendus reviennent.

**À retenir :** le but n’est pas le plus grand nombre de matchs, mais moins de surprises entre le profil et la personne réelle.$fr701$, 'PROFILES', 701),
('fr', 'fr-profil-de-couple-deux-voix', 'Profil de couple : deux voix, pas une marque commune', 'Un profil de couple doit rendre chacun visible, expliquer l’intention commune et montrer que personne ne délègue son consentement.', $fr702$Un profil commun devient facilement la voix du partenaire qui écrit davantage, répond plus vite ou se montre le plus enthousiaste. Corrigez volontairement ce déséquilibre. Présentez chaque personne séparément : intérêts, orientation si pertinente, limites, disponibilité et attentes.

Expliquez ensuite l’intention commune. Cherchez-vous une conversation, un lien régulier, un autre couple ou une expérience particulière ? Quelles décisions sont individuelles et lesquelles nécessitent un accord commun ? Évitez un scénario achevé dans lequel une autre personne devrait simplement entrer.

### Signes de confiance

- Les deux partenaires connaissent le profil et peuvent y accéder.
- Chacun approuve ses photos et données personnelles.
- Les partenaires peuvent parler directement, sans gestionnaire.
- Une attirance asymétrique peut être évoquée sans reproche.
- La nouvelle personne ne servira pas à réparer un conflit.

Précisez si les messages sont lus par les deux partenaires ; la confidentialité change lorsqu’une conversation possède un public invisible.

**À retenir :** un bon profil de couple ne dissout pas deux personnes dans une marque ; il montre deux adultes responsables capables d’une invitation commune.$fr702$, 'PROFILES', 702),
('fr', 'fr-photos-de-profil-attirance-authenticite-et-exposition', 'Photos de profil : attirance, authenticité et contrôle de l’exposition', 'Les photos doivent créer assez de confiance sans révéler plus que votre tolérance au risque. Authenticité et confidentialité peuvent coexister.', $fr703$Les photos communiquent rapidement une présence, mais contiennent aussi beaucoup de données identifiantes. Décidez de leur fonction : montrer une apparence actuelle, un style, une chaleur ou la complicité d’un couple. Retirez ensuite les détails inutiles.

Utilisez des images récentes et représentatives. Filtres lourds, photos anciennes ou image d’une autre personne peuvent attirer des clics, mais détruisent la confiance lors de la rencontre. La confidentialité n’exige pas la tromperie : une image recadrée ou légèrement floutée peut rester honnête si sa limite est claire.

### Contrôler l’exposition

Vérifiez arrière-plans, miroirs, badges professionnels, objets d’enfants, plaques, tatouages et métadonnées. Obtenez le consentement de chaque personne reconnaissable. N’utilisez pas la photo d’un ex ou d’un ami dans un contexte intime.

Répartissez les images entre galeries publique, floutée et privée. Une galerie privée n’empêche pas toutes les captures.

**À retenir :** une photo efficace est actuelle, sincère et volontairement exposée, pas seulement séduisante.$fr703$, 'PROFILES', 703),
('fr', 'fr-preferences-sans-deshumaniser', 'Préférences sans déshumaniser : filtres, langage et compatibilité', 'Chacun choisit ses relations. Ce choix peut être exprimé clairement sans transformer les identités et les corps en insultes.', $fr704$L’attirance est personnelle et personne ne doit un accès romantique ou sexuel. Mais une préférence n’a pas besoin de devenir un jugement public sur la valeur, la propreté ou la normalité des personnes exclues.

Écrivez en direction de la compatibilité. Décrivez les dynamiques, la distance, la disponibilité ou les pratiques qui vous conviennent. Évitez exclusions humiliantes, stéréotypes raciaux, fétichisation des identités et langage réduisant une personne à une partie du corps nécessaire au scénario.

### Examiner le filtre

Certains filtres protègent une vraie limite ; d’autres reproduisent des suppositions jamais questionnées. La catégorie prédit-elle réellement la qualité recherchée ? Une liste idéale très étroite peut ne laisser aucune place à un être humain réel.

Les intérêts privés ne doivent pas être imposés dans le premier message. Signalez-les suffisamment pour permettre un choix, puis discutez après un intérêt réciproque.

Pour décliner, un message court et respectueux suffit. Personne n’a besoin d’une liste de traits impossibles à changer.

**À retenir :** les filtres organisent la découverte ; ils n’autorisent pas à déshumaniser ceux qui restent dehors.$fr704$, 'PROFILES', 704),

('fr', 'fr-une-premiere-rencontre-plus-sure', 'Une première rencontre plus sûre : un plan simple et une sortie facile', 'Rencontrez-vous en public, gardez votre propre transport et transmettez les détails pratiques à une personne de confiance.', $fr801$Une première rencontre sert à recueillir des informations, pas à prouver votre confiance. Choisissez un lieu public, fréquenté et accessible, avec du réseau mobile. Arrivez et repartez séparément pour que personne ne contrôle votre retour.

Indiquez à une personne de confiance qui vous rencontrez, où et à quelle heure vous donnerez des nouvelles. Partagez le profil ou les coordonnées disponibles. Prévoyez une action claire si vous manquez le point de contact.

### Garder un plan réversible

Ne donnez pas votre adresse et n’acceptez pas d’y être pris en voiture. Limitez l’alcool et gardez boisson, téléphone, clés et affaires. Passer dans un lieu privé constitue une nouvelle décision, jamais une suite automatique.

Avec un couple, confirmez que les deux personnes connaissent le rendez-vous et correspondent au profil. Vous pouvez partir parce que l’atmosphère semble mauvaise, même sans preuve facile à expliquer.

Préparez une phrase de départ, une batterie et l’argent du trajet. La politesse n’oblige pas à rester.

**À retenir :** un bon plan ne prédit pas le danger ; il conserve vos choix pendant que vous découvrez la personne.$fr801$, 'FIRST_MEETINGS', 801),
('fr', 'fr-attentes-alcool-et-rythme', 'Attentes, alcool et rythme : ce qu’il vaut mieux dire avant d’arriver', 'Clarifier le but et les limites de la rencontre évite les suppositions. L’alcool ne transforme jamais une situation ambiguë en consentement.', $fr802$Avant de vous voir, définissez la forme de base : café, dîner, conversation, intimité possible ou explicitement aucune intimité. Précisez qui sera présent, la durée, le paiement, le transport et les limites fermes. Un rendez-vous n’est pas un contrat, mais la clarté réduit la pression des attentes incompatibles.

Si de l’alcool est prévu, fixez vos limites à jeun. Gardez votre boisson et ne l’utilisez pas comme courage pour une étape non discutée. Une personne trop intoxiquée pour comprendre ou choisir ne peut pas consentir, même si elle était enthousiaste plus tôt.

### Le rythme appartient à tous

Le rythme le plus lent et confortable fixe celui de l’activité commune. Conversation, contact, baiser et lieu privé sont des décisions séparées.

Un couple doit éviter l’effet deux contre un et les apartés codés. Donnez à l’autre personne l’espace de faire une pause sans surveiller votre déception. Convenez aussi de la fin de la rencontre et d’un éventuel message ultérieur.

**À retenir :** dites assez avant d’arriver pour que personne n’ait à négocier sa sécurité lorsque l’attirance et l’alcool ont déjà changé la situation.$fr802$, 'FIRST_MEETINGS', 802),
('fr', 'fr-rencontrer-un-couple-sans-entretien-embauche', 'Rencontrer un couple sans donner l’impression d’un entretien d’embauche', 'La curiosité doit circuler dans toutes les directions. La troisième personne évalue aussi le couple et mérite une conversation, pas une audition.', $fr803$Un couple arrive souvent après une longue discussion privée et avec une liste de questions. La nouvelle personne, sans cette préparation commune, peut se sentir devant un jury. Remplacez l’interrogatoire par une découverte mutuelle.

Partagez avant d’exiger. Expliquez votre relation, votre intention et vos limites pertinentes, puis accueillez les questions. Chaque partenaire parle en son nom. Ne comparez pas les réponses en direct et ne cherchez pas la preuve que la personne correspond à un rôle prédéfini.

### Équilibrer l’échange

Parlez d’intérêts, de rythme et d’attentes, pas seulement de disponibilité sexuelle. Laissez exister la conversation ordinaire. Observez si la disposition, les regards ou les plaisanteries privées excluent quelqu’un.

La personne invitée évalue aussi : les deux partenaires consentent-ils vraiment ? Peuvent-ils être en désaccord avec respect ? Que se passe-t-il si l’attirance est inégale ?

Personne ne doit décider à table. Le voyage, le dîner et le temps investi ne créent aucune dette.

**À retenir :** une première rencontre n’est pas une audition, mais plusieurs adultes décidant librement si une autre conversation a du sens.$fr803$, 'FIRST_MEETINGS', 803),
('fr', 'fr-apres-la-premiere-rencontre', 'Après la première rencontre : intérêt, refus et silence', 'Une communication claire et rapide est plus bienveillante que l’ambiguïté. L’intérêt peut s’exprimer sans pression et le refus sans jugement personnel.', $fr804$Après une première rencontre, le délai de réponse, la ponctuation et le silence prennent facilement trop de sens. Réduisez l’incertitude par un accord simple : quand et par quel canal chacun donnera-t-il des nouvelles ?

Si vous êtes intéressé, dites ce que vous avez apprécié et proposez une étape concrète, en laissant une vraie place au non. N’exigez pas une réassurance immédiate et ne faites pas de promesses intenses après une seule rencontre.

### Refuser clairement

Un refus respectueux peut être bref : « Merci pour cette rencontre. Je n’ai pas ressenti la compatibilité nécessaire et je ne poursuivrai pas. Je vous souhaite le meilleur. » Inutile de critiquer l’apparence ou l’identité. Un couple doit éviter de rendre un partenaire responsable comme prétexte.

Disparaître peut être adapté si le contact semble dangereux ou si une limite est déjà ignorée. Sinon, un message clair est généralement plus humain. Après un non, ne négociez pas et ne contactez pas l’autre membre du couple pour renverser la décision.

**À retenir :** la clôture est un petit geste de soin qui protège la dignité même sans compatibilité.$fr804$, 'FIRST_MEETINGS', 804),

('fr', 'fr-desir-fantasme-et-pratique', 'Désir, fantasme et pratique : tout ce qui excite n’a pas besoin d’arriver', 'Un fantasme peut avoir de la valeur sans devenir un projet. Séparez imagination, curiosité et volonté réelle avant d’impliquer quelqu’un.', $fr901$Le fantasme est un espace où les conséquences, la logistique et l’autonomie d’autrui peuvent disparaître. C’est une partie de sa fonction. Désirer une idée dans l’imaginaire ne signifie pas vouloir tous ses détails réels, et choisir de ne pas la réaliser ne rend pas le fantasme faux.

Demandez quel élément crée l’excitation : nouveauté, pouvoir, attention, tabou, abandon, esthétique ou acte précis. Le besoin sous-jacent peut souvent être exploré de plusieurs manières, par la parole, la fiction, un jeu de rôle ou une version limitée et moins risquée.

### Tester doucement la réalité

Passez du fantasme à l’information avant l’action. Étudiez les risques, discutez au calme, identifiez les signaux d’arrêt et imaginez l’après. Ne recrutez jamais une personne comme accessoire d’un scénario qu’elle ne comprend pas pleinement. Ses désirs peuvent modifier le projet et son consentement peut être retiré.

Certains intérêts doivent rester imaginés parce que le risque est inacceptable ou le consentement impossible.

**À retenir :** le fantasme demande « qu’est-ce qui m’excite ? » ; la pratique doit aussi demander « qu’est-ce qui est sûr, consenti et durable pour tous ? »$fr901$, 'PRIVATE_INTERESTS', 901),
('fr', 'fr-partager-un-interet-sans-pression', 'Comment partager un intérêt sans mettre de pression', 'Se dévoiler doit offrir une information et un espace pour refuser, pas créer un test d’amour, d’ouverture ou de sophistication.', $fr902$Choisissez un moment calme, hors de l’activité sexuelle. Demandez si la personne souhaite entendre parler d’un intérêt et précisez qu’écouter n’oblige pas à l’essayer. Cette autorisation évite une négociation surprise sous l’effet de l’excitation.

Expliquez ce que l’intérêt signifie pour vous, pas seulement son étiquette. Un même mot peut couvrir des pratiques et intensités très différentes. Dites s’il s’agit d’un fantasme, d’une curiosité ou d’un besoin important pour votre compatibilité.

### Laisser la réponse ouverte

Accueillez les questions et donnez du temps. Un partenaire peut avoir besoin d’informations, de réflexion ou dire non définitivement. Ne répondez pas à l’hésitation par persuasion répétée, cadeaux, culpabilité ou accusations de manque de confiance.

Vous pouvez conclure qu’un intérêt non partagé crée une incompatibilité, mais ne transformez pas cette conséquence en pression. Si la réponse est peut-être, précisez les conditions d’une nouvelle conversation ; aucune pratique ne commence sans enthousiasme clair.

**À retenir :** un partage respectueux rend l’honnêteté possible sans rendre l’autre responsable de satisfaire chaque désir.$fr902$, 'PRIVATE_INTERESTS', 902),
('fr', 'fr-liste-oui-non-peut-etre', 'La liste Oui, Non, Peut-être : transformer les étiquettes en décisions concrètes', 'Une liste commune ouvre une conversation, mais n’est jamais un consentement permanent. Définissez actes, conditions et signaux.', $fr903$Les listes Oui/Non/Peut-être permettent de découvrir des points communs sans obliger une personne à introduire chaque sujet à voix haute. Leur valeur se trouve dans la conversation qui suit, pas dans le formulaire rempli.

Remplissez d’abord la liste séparément. **Oui** signifie que vous souhaitez sincèrement en parler ou essayer sous certaines conditions. **Non** n’est pas négociable maintenant. **Peut-être** exige plus d’informations, de confiance, une intensité moindre ou un contexte particulier. « Je ne sais pas » est aussi valable.

### Préciser chaque élément

Une étiquette comme contrainte, jeu de groupe ou photographie peut désigner des réalités très différentes. Définissez personnes, actes, durée, intensité, confidentialité, santé sexuelle et manière d’arrêter. Mentionnez les besoins d’après-soin ou risques pertinents.

Comparez sans noter la générosité. Un oui passé n’est pas un levier et une correspondance sur papier n’est pas un consentement présent. Dans un groupe, chacun possède sa propre liste ; la majorité ne peut pas voter la participation d’une minorité.

**À retenir :** la liste cartographie une conversation possible. Le consentement reste spécifique, actuel et révocable.$fr903$, 'PRIVATE_INTERESTS', 903),
('fr', 'fr-explorer-en-conscience-des-risques', 'Explorer en conscience des risques : préparation, signaux et soins après', 'Le risque ne disparaît pas toujours, mais il peut être compris et réduit. Préparez connaissances, matériel, signaux d’arrêt et soins ultérieurs.', $fr904$Explorer en conscience commence par nommer les dangers réels : blessure, panique, infection, perte de confidentialité, détresse émotionnelle ou jugement altéré. Consultez des sources crédibles et, pour les pratiques plus risquées, cherchez une formation compétente plutôt que du contenu spectaculaire.

Avant de commencer, convenez des rôles, limites, intensité, durée, contre-indications et signal d’arrêt. Un système de couleurs peut aider, mais prévoyez aussi des signaux non verbaux. Chacun doit savoir que l’arrêt entraîne immédiatement du soin, jamais une punition.

### Préparer l’environnement

Prévoyez matériel adapté, hygiène, communication, transport et plan d’urgence. Ne combinez pas une pratique inconnue avec une forte intoxication. Une personne sobre et capable doit pouvoir reconnaître le danger et agir.

Les soins après varient : chaleur, eau, silence, réassurance, espace ou message le lendemain. Promettez seulement ce que vous pouvez offrir. Débriefez ensuite les effets et ajustez les limites.

**À retenir :** la préparation protège la spontanéité en donnant à chacun les moyens de ralentir, s’arrêter et prendre soin.$fr904$, 'PRIVATE_INTERESTS', 904);

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
SELECT
  (
    SUBSTR(MD5(t."locale" || ':' || t."category"::TEXT || ':' || t."sortOrder"::TEXT), 1, 8) || '-' ||
    SUBSTR(MD5(t."locale" || ':' || t."category"::TEXT || ':' || t."sortOrder"::TEXT), 9, 4) || '-' ||
    SUBSTR(MD5(t."locale" || ':' || t."category"::TEXT || ':' || t."sortOrder"::TEXT), 13, 4) || '-' ||
    SUBSTR(MD5(t."locale" || ':' || t."category"::TEXT || ':' || t."sortOrder"::TEXT), 17, 4) || '-' ||
    SUBSTR(MD5(t."locale" || ':' || t."category"::TEXT || ':' || t."sortOrder"::TEXT), 21, 12)
  ),
  t."slug", t."title", t."category", t."summary", t."body", source."icon", source."authorId",
  TRUE, CURRENT_TIMESTAMP,
  GREATEST(1, CEIL(ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(TRIM(t."body"), E'\\s+'), 1) / 200.0)::INTEGER),
  t."locale", t."title", t."summary",
  t."sortOrder", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "guide_editorial_translations" t
JOIN "guide_articles" source
  ON source."locale" = 'pt'
 AND source."category" = t."category"
 AND source."sortOrder" = t."sortOrder"
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = EXCLUDED."locale",
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;
