import { Db } from "mongodb";

export async function getPending(db: Db, id: string) {
    return (await (await db.collection("cpost").aggregate([{ $match: { "_id.authorId": id, "status": { $in: [0, 2] } } }, { $group: { "_id": "$_id.authorId", "total": { $sum: "$count" } } }]).next()))?.total ?? 0;
}
