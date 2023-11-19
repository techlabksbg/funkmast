// nbrs is 3x3-Array with true/false if nbrs are present or not
// selected is true/false
function makeSVG(selected, color, nbrs = [[false, false, false],[false, true, false], [false, false, false]]) {

    const top = nbrs[1][0],
        bottom = nbrs[1][2],
        left = nbrs[0][1],
        right = nbrs[2][1],
        topleft = nbrs[0][0],
        topright = nbrs[2][0],
        bottomleft = nbrs[0][2],
        bottomright = nbrs[2][2];

    // From https://stackoverflow.com/questions/13069446/simple-fill-pattern-in-svg-diagonal-hatching
    let filldef = !selected ? "" : '<pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="25" height="25"><rect x="-1" y="-1" width="27" height="27" fill="'+color+'" fill-rule="evenodd"/><path d="M-5,5 l10,-10 M-5,30 l35,-35 M20,30 l10,-10" style="stroke:#ffffff88; stroke-width:8" /> </pattern>';
    let fillUse = !selected ? color : "url(#diagonalHatch)"

    const margin = 10;


    let path = [];

    //////////////////////////////////////
    // Foreign code, license unclear
    // shamelessly copied from https://www.andrewt.net/puzzles/cell-tower/player/common/blob-svg.js
    ////////////////////////////////////////////

    // start in top left
    if (top) path.push(`M ${left ? -margin : margin} ${-margin}`);
    else path.push(`M ${left ? -margin : margin * 2} ${margin}`);

    // draw top edge and top right corner
    if (top && right && !topright) path.push(
        `L ${100 - margin} ${-margin}`,
        `L ${100 - margin} 0`,
        `A ${margin} ${margin} 0 0 0 100 ${margin}`,
        `L ${100 + margin} ${margin}`,
    );
    else if (right) path.push(`L ${100 + margin} ${top ? -margin : margin}`);
    else if (top) path.push(`L ${100 - margin} ${-margin}`);
    else path.push(
        `L ${100 - margin * 2} ${margin}`,
        `A ${margin} ${margin} 0 0 1 ${100 - margin} ${margin * 2}`
    );

    // draw right edge and bottom right corner
    if (bottom && right && !bottomright) path.push(
        `L ${100 + margin} ${100 - margin}`,
        `L 100 ${100 - margin}`,
        `A ${margin} ${margin} 0 0 0 ${100 - margin} 100`,
        `L ${100 - margin} ${100 + margin}`,
    );
    else if (bottom) path.push(`L ${right ? 100 + margin : 100 - margin} ${100 + margin}`);
    else if (right) path.push(`L ${100 + margin} ${100 - margin}`);
    else path.push(
        `L ${100 - margin} ${100 - margin * 2}`,
        `A ${margin} ${margin} 0 0 1 ${100 - margin * 2} ${100 - margin}`
    );

    // draw bottom edge and bottom left corner
    if (bottom && left && !bottomleft) path.push(
        `L ${margin} ${100 + margin}`,
        `L ${margin} 100`,
        `A ${margin} ${margin} 0 0 0 0 ${100 - margin}`,
        `L ${-margin} ${100 - margin}`,
    );
    else if (left) path.push(`L ${-margin} ${bottom ? 100 + margin : 100 - margin}`);
    else if (bottom) path.push(`L ${margin} ${100 + margin}`);
    else path.push(
        `L ${margin * 2} ${100 - margin}`,
        `A ${margin} ${margin} 0 0 1 ${margin} ${100 - margin * 2}`
    );

    // draw left edge and top left corner
    if (top && left && !topleft) path.push(
        `L ${-margin} ${margin}`,
        `L 0 ${margin}`,
        `A ${margin} ${margin} 0 0 0 ${margin} 0`,
        `L ${margin} ${-margin}`,
    );
    else if (top || left) path.push(`Z`);
    else path.push(
        `L ${margin} ${margin * 2}`,
        `A ${margin} ${margin} 0 0 1 ${margin * 2} ${margin}`
    );

    let svg = `<svg viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
    ${filldef}
    <g stroke="none" fill="#000000" fill-rule="evenodd">
        <rect x="-5" y="-5" width="110" height="110"></rect>
    </g>
    <path
        stroke="none"
        fill="${fillUse}" fill-rule="evenodd"
        d="${path.join(' ')}"
    />
    </svg>`;
    ///////////////////////////////////////////
    // End of foreign code
    //////////////////////////////////////////
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export { makeSVG };