export type EmailTemplate = {
	subject: string;
	body: string;
};

export const EMAIL_TEMPLATES = {
	HAZARDS_CAE: {
		subject: `[Workflow AxS] Modification d’un local dangereux`,
		body: `Bonjour,<br/><br/>
A la suite d’un changement dans LHD, par {{modifiedByName}} le {{modifiedOn}}, le
danger dans le local ci-dessous a été modifié :<br/>
• <b>Local</b> : {{room}}<br/>
• <b>Statut</b> : {{action.fr}}<br/>
• <b>Type de danger</b> : {{hazardType}}<br/>
• <b>Lien vers LHD</b> : <a href="${process.env.APP_BASE_PATH}/roomdetails?room={{room}}">{{room}}</a><br/>
• <b>Commentaires</b> : <i>{{comments}}</i><br/><br/>
Nous vous remercions de bien vouloir faire les changements nécessaires dans AxS.<br/><br/>
Pour rappel, voici les étapes qui sont importantes de ne pas oublier :<br/>
• Mettre à jour le local dans le workflow AxS<br/>
• Mettre à jour le local dans le groupe de porte de l’entreprise de nettoyage (i.e. Pour les P2 : ajout/suppression dans le groupe ORANGE)<br/>
• Mettre à jour le local dans les groupes de portes et profils concernés<br/>
• Mettre à jour si nécessaire les lecteurs offlines<br/>
• Confirmer à la personne d’OHS en copie que c’est à jour.<br/><br/>
En cas de questions, merci de contacter la personne en copie de ce message.<br/>
Merci d’avance,<br/>
Support OHS`,
	},
	HAZARDS_COSEC: {
		subject: `[Fiche de porte] Mise à jour nécessaire / Update needed`,
		body: `<i>------ ENGLISH BELOW ------</i><br/><br/>
Bonjour,<br/><br/>
A la suite d’un changement dans LHD, par {{modifiedByName}} de l’équipe OHS-PR, le {{modifiedOn}}, le niveau de danger du local ci-dessous a été modifié :<br/>
• <b>Local</b> : {{room}}<br/>
• <b>Statut</b> : {{action.fr}}<br/>
• <b>Type de danger</b> : {{hazardType}}<br/><br/>
Nous vous prions de bien vouloir vérifier et mettre à jour la fiche de porte du local dans CRISTAL.
Vous pouvez vous connecter ici : <a href="https://cristal.epfl.ch/">CRISTAL</a>.<br/><br/>
En cas de questions, veuillez ouvrir ticket via <a href="https://go.epfl.ch/support-ohs">support-ohs</a><br/>
Nous vous remercions de votre collaboration,<br/>
Support OHS<br/><br/><br/>
-------------------------------------------------------------<br/><br/>
Dear COSEC,<br/><br/>
Following a change in LHD, by {{modifiedByName}} from the OHS-PR team, on {{modifiedOn}}, the hazard level of the room below has been updated:<br/>
• <b>Room</b>: {{room}}<br/>
• <b>Status</b>: {{action.en}}<br/>
• <b>Hazard type</b>: {{hazardType}}<br/><br/>
We kindly ask you to check and update the door sign of the room in CRISTAL. You can log in here: <a href="https://cristal.epfl.ch/">CRISTAL</a>.<br/><br/>
If you have any questions, please open a ticket via <a href="https://go.epfl.ch/support-ohs">support-ohs</a>.<br/>
Thank you for your cooperation,<br/>
OHS Support`,
	},
	CHEMICAL: {
		subject: 'LHD - Mise à jour de la table des produits chimiques sous autorisation',
		body: `Bonjour, <br/>
en pièce jointe vous pouvez trouver la liste des produits chimiques mise à jour.<br/>
Cordialement,<br/>
LHD`
	},
	NEW_DISPENSATION: {
		subject: `Dispensation/Dérogation: {{dispNumber}}`,
		body: `A dispensation has been granted in your name by the OHS.<br/>
Une dérogation vous a été accordée par le OHS.
${getDispensationEmailBody()}`,
	},
	RENEW_DISPENSATION: {
		subject: `Dispensation/Dérogation: {{dispNumber}}`,
		body: `A renewal of the dispensation {{dispNumber}} has been granted in your name by the OHS.<br/>
Un renouvellement de la dérogation {{dispNumber}} vous a été accordée par le OHS.
${getDispensationEmailBody()}`,
	},
	EXPIRED_DISPENSATION: {
		subject: `Dispensation/Dérogation: {{dispNumber}}`,
		body: `The dispensation {{dispNumber}} has expired. If an extension is required, please submit a new request on https://go.epfl.ch/support-ohs.<br/>
La dérogation {{dispNumber}} a expiré. Si une prolongation est nécessaire, veuillez soumettre une nouvelle demande sur https://go.epfl.ch/support-ohs.
${getDispensationEmailBody()}`,
	},
	MODIFIED_DISPENSATION: {
		subject: `Dispensation/Dérogation: {{dispNumber}}`,
		body: `The dispensation {{dispNumber}} has been modified.<br/>
La dérogation {{dispNumber}} a étée modifiée.
${getDispensationEmailBody()}`,
	},
	CANCELLED_DISPENSATION: {
		subject: `Dispensation/Dérogation: {{dispNumber}}`,
		body: `The dispensation {{dispNumber}} has been cancelled.<br/>
La dérogation {{dispNumber}} a étée anullée.
${getDispensationEmailBody()}`,
	}
} as const satisfies Record<string, EmailTemplate>;

function getDispensationEmailBody () {
	return `<br/><br/>
• <b>Dispensation/Dérogation</b>: <a href="${process.env.APP_BASE_PATH}/dispensationscontrol?Dispensation={{dispNumber}}">{{dispNumber}}</a><br/>
• <b>Author/Auteur</b>: {{modifiedByName}}<br/>
• <b>Subject/Sujet</b>: {{subject}}<br/>
• <b>Start date/Début</b>: {{dateStart}}<br/>
• <b>Expiration date/Echéance</b>: {{dateEnd}}<br/>
• <b>Room/Local</b>: {{rooms}}<br/>
• <b>Holder/Détenteur</b>: {{holders}}<br/>
• <b>Requirements/Requis</b>: {{requirements}}<br/>
• <b>Comment/Commentaire</b>: {{comments}}<br/>
• <b>Status/Etat</b>: {{status}}<br/>
• <b>Numéro ticket OHS</b>: {{tickets}}<br/>`;
}

export function logRecipients (to: string[], cc: string[], bcc: string[]) {
	return `<b>TO</b>: ${to.join(', ')}<br/>
	<b>CC</b>: ${cc.join(', ')}<br/>
	<b>BCC</b>: ${bcc.join(', ')}<br/><br/>`
}

export function logAction (created: boolean, deleted: boolean) {
	if (created) return {'fr': 'Création', 'en': 'Created'};
	else if (deleted) return {'fr': 'Suppression', 'en': 'Deleted'};
	else return {'fr': 'Modification', 'en': 'Modified'};
}
