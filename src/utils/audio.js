const alarmBase64 = "data:audio/wav;base64,UklGRoQJAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWAJAACAyvj4yoA1Bwc1f8r398mANggINn/J9/fJfzYJCTZ/yfb2yX83CQo3f8j19ciANwoKN4DI9PTIfzcLCzh/x/T0x384DAw4gMfz88d/OAwMOH/G8vLGfzkNDTl/xvLxxn85Dg45gMbx8cV/Og8POoDF8PDFfzoPDzp/xe/vxX87EBA7gMTv78R/OxERO4DE7u7EgDsRETuAw+3tw388EhI8f8Pt7cOAPBMTPIDD7OzCgD0TEz1/wuvrwoA9FBQ9gMLr68J/PRUVPoDB6urBgD4VFT6AwenpwYA+FhY+gMHp6cCAPxcXP4DA6OjAfz8XFz9/wOfnwH8/GBhAgL/n57+AQBkZQIC/5ua/gEAZGUCAv+Xlvn9BGhpBgL7l5b6AQRsbQYC+5OS+gEEbG0KAveTjvYBCHBxCgL3j471/QhwcQn+94uK8f0MdHUN/vOLivH9DHh5DgLzh4byAQx4eQ3+74OC7f0QfH0R/u+Dgu39EHyBEf7vf37uARCAgRYC639+6gEUhIUWAut7eun9FISFFgLrd3bl/RiIiRn+53d25f0YiIkaAudzcuYBGIyNGf7nc3Lh/RyQkR4C429u4f0ckJEd/uNvbuIBHJSVHgLfa2rd/SCUlSIC32dm3gEgmJkh/t9nZt4BIJiZJgLbY2LZ/SScnSYC22Ni2gEkoKEl/ttfXtn9JKChKgLXX17V/SikpSn+11ta1f0opKUqAtdbWtX9KKipLgLTV1bR/SyoqS4C01dS0gEsrK0t/tNTUtIBLKytMgLPT07OATCwsTH+z09OzgEwsLEyAs9LSs39MLS1Mf7LS0rKATS0tTYCy0dGyf00uLk2AstHRsoBNLi5Nf7LQ0LF/Ti8vToCx0NCxf04vL05/sc/PsX9OMDBOgLHPz7B/TzAwT4Cwzs6wf08xMU9/sM7OsIBPMTFPf7DNzbCATzIyUICvzc2vgFAyMlB/r8zMr4BQMzNQgK/MzK9/UDMzUH+uy8uugFE0NFF/rsvLrn9RNDRRgK7Lyq6AUTU1UX+uysquf1I1NVKArcrKrX9SNjZSgK3Jya1/UjY2UoCtycmtf1I3N1KArMjIrIBTNzdTf6zIyKyAUzc4U4Csx8esf1M4OFOArMfHrIBUODhUf6vGxquAVDk5VH+rxsargFQ5OVSAq8bFq39UOjpUgKvFxap/VTo6VYCqxcWqf1U7O1V/qsTEqoBVOztVf6rExKp/VTs7VYCpw8Opf1Y8PFaAqcPDqX9WPDxWgKnDwql/Vj09Vn+pwsKpgFY9PVd/qMLCqIBXPj5Xf6jBwaiAVz4+V4CowcGof1c+PleAqMDAqH9XPz9YgKfAwKeAWD8/WH+nwMCngFhAQFh/p7+/p4BYQEBYgKe/v6eAWEBAWYCmvr6mgFlBQVmApr6+poBZQUFZf6a+vqaAWUJCWYCmvb2mgFlCQlmApb29pYBaQkJagKW9vaV/WkNDWoClvLylf1pDQ1qApby8pYBaQ0NagKW7u6SAW0REW3+ku7ukf1tERFt/pLu7pH9bRUVbf6S6uqR/W0VFW4CkurqkgFtFRVx/o7q6o39cRkZcf6O5uaN/XEZGXH+jubmjf1xGRlyAo7i4o39cR0dcgKO4uKJ/XUdHXX+iuLiif11HR11/ore3on9dSEhdgKK3t6J/XUhIXYCit7eigF1ISF6Aoba2oYBeSUlef6G2tqGAXklJXn+htrahgF5JSV6AobW1oYBeSkpegKG1taGAXkpKX4CgtbWgf19KS19/oLS0oIBfS0tfgKC0tKCAX0tLX4CgtLSggF9LS1+AoLOzoH9gTExggJ+zs59/YExMYICfs7OfgGBMTGB/n7Kyn4BgTU1gf5+ysp9/YE1NYH+fsrKff2BNTWF/nrGxnn9hTk5hgJ6xsZ6AYU5OYX+esbGef2FOTmF/nrGxnn9hT09hf56wsJ5/YU9PYoCdsLCdf2JPT2KAnbCwnX9iUFBif52vr51/YlBQYn+dr6+df2JQUGJ/na+vnYBiUFBigJ2urpyAY1FRY4Ccrq6cgGNRUWN/nK6unIBjUVFjf5yurpyAY1JSY4Ccra2cgGNSUmOAnK2tnIBjUlJkgJutrZt/ZFJSZICbrKybgGRTU2SAm6ysm4BkU1NkgJusrJuAZFNTZICbrKybf2RUVGSAm6urm39kVFRlf5qrq5qAZVRUZX+aq6uagGVUVGV/mquqmoBlVVVlgJqqqpqAZVVVZYCaqqqaf2VVVWWAmqqqmn9lVVVmf5mpqZl/ZlZWZn+ZqamZf2ZWVmZ/mampmX9mVlZmf5mpqZl/ZlZWZn+ZqKiZf2ZXV2aAmaiomYBmV1dmgJioqJiAZ1dXZ4CYqKiYgGdXV2eAmKenmIBnWFhngJinp5iAZ1hYZ4CYp6eYgGdYWGd/mKenmIBnWFhnf5impph/aFlZaH+XpqaXf2hZWWiAl6aml39oWVlogJemppd/aFlZaICXpaWXgGhaWmiAl6Wll4BoWlpogJelpZeAaFpaaICXpaWWgGlaWmmAlqWkln9pW1tpf5akpJZ/aVtbaX+WpKSWf2lbW2l/lqSkln9pW1tpf5akpJZ/aVxcaX+Wo6OWf2lcXGl/lqOjloBqXFxqgJWjo5WAalxcaoCVo6OVf2pcXGqAlaKilX9qXV1qgJWiopV/al1daoCVoqKVgGpdXWp/laKilX9qXV1qf5WiopWAal1dan+UoaGUf2teXmt/lKGhlH9rXl5rf5ShoZR/a15ea4CUoaGUgGteXmt/lKGhlH9rX19rgJSgoJSAa19fa3+UoKCUf2tfX2uAlKCglIBrX19sf5OgoJN/bF9fbH+ToKCTf2xgYGx/k5+fk4BsYGBsgJOfn5N/bGBgbH+Tn5+TgGxgYGyAk5+fk4BsYGBsf5Ofn5OAbGFhbICTnp6TgGxhYWyAkp6ekoBtYWFtgJKenpJ/bWFhbYCSnp6SgG1hYW2Akp6ekn9tYWFtf5KdnZKAbWJibYCSnZ2Sf21iYm1/kp2dkn9tYmJtf5KdnZJ/bWJibYCSnZ2SgG5iYm5/kZ2ckX9uY2NugJGcnJGAbmNjbn+RnJyRf25jY26AkZyckYBuY2NugJGcnJF/bmNjbn+RnJyRf25jY25/kZubkX9uZGRugJGbm5F/bmRkbn+Rm5uRf25kZG+AkJubkIBvZGRvf5Cbm5CAb2Rkb4CQm5uQgG9kZW8=";

let alarmAudio = null;
let clickAudio = null;

export const playClick = () => {
  try {
    if (!clickAudio) {
      clickAudio = new Audio(alarmBase64);
      clickAudio.volume = 0.2; // Softer for click
    }
    clickAudio.currentTime = 0;
    clickAudio.play().catch(() => {});
    
    // Stop early for a "click" effect instead of the full beep
    setTimeout(() => {
      clickAudio.pause();
    }, 50);
  } catch (e) {
    console.warn("Click play failed", e);
  }
};

export const startAlarmLoop = () => {
  try {
    if (!alarmAudio) {
      alarmAudio = new Audio(alarmBase64);
      alarmAudio.loop = true;
      alarmAudio.volume = 0.8;
    }
    alarmAudio.currentTime = 0;
    alarmAudio.play().catch(() => {});
  } catch (e) {
    console.warn("Alarm play failed", e);
  }
};

export const stopAlarmLoop = () => {
  try {
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
  } catch (e) {
    console.warn("Alarm stop failed", e);
  }
};
