import {graphql} from "graphql";
import {schema} from "../../nexus/schema";
import {Prisma, PrismaClient} from "@prisma/client";

export async function makeQuery(query: string, user: string) {
		const clientOptions: Prisma.PrismaClientOptions = {};

		const result = await graphql({
			schema,
			source: query,
			contextValue: {
				prisma: new PrismaClient({
					datasources: { db: { url: process.env.LHD_DB_URL } },
					...clientOptions,
				}),
				user: {
					preferred_username: user,
					groups:[]
				}
			}
		});

		if (result.errors) {
			throw new Error(result.errors.join("\n"));
		}
		return result.data as any;
}
